import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { PRODUCT_COLUMNS, toProduct, toSale } from "../db/mappers.js";
import { HttpError } from "../http.js";
import { computeTotals } from "../pricing.js";
import type { Product, SaleLine } from "../types.js";
import { parseBody } from "../validate.js";

const checkoutInput = z.object({
  lines: z
    .array(z.object({ productId: z.string().min(1), qty: z.number().int().positive().max(999) }))
    .min(1)
    .max(200),
  discountPercent: z.number().min(0).max(100).default(0),
  paymentMethod: z.enum(["cash", "card", "qris"]),
  paid: z.number().int().min(0).max(1_000_000_000).default(0),
});

const SALE_SELECT = `
  SELECT s.id, s.number, s.created_at, s.subtotal, s.discount_percent::float8 AS discount_percent,
         s.discount_amount, s.tax, s.total, s.paid, s.change_due, s.payment_method,
         COALESCE(
           json_agg(
             json_build_object(
               'productId', l.product_id, 'sku', l.sku, 'name', l.name,
               'unitPrice', l.unit_price, 'qty', l.qty, 'lineTotal', l.line_total
             ) ORDER BY l.line_no
           ) FILTER (WHERE l.sale_id IS NOT NULL),
           '[]'
         ) AS lines
    FROM sales s
    LEFT JOIN sale_lines l ON l.sale_id = s.id`;

interface Shortage {
  productId: string;
  name: string;
  requested: number;
  available: number;
}

export const salesRouter = Router();

salesRouter.get("/", async (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
  const db = await getDb();
  const { rows } = await db.query(`${SALE_SELECT} GROUP BY s.id ORDER BY s.created_at DESC LIMIT $1`, [limit]);
  res.json(rows.map(toSale));
});

salesRouter.post("/", async (req, res) => {
  const input = parseBody(checkoutInput, req.body);

  // Merge duplicate lines, then lock rows in a fixed order so two tills can't deadlock.
  const requested = new Map<string, number>();
  for (const line of input.lines) requested.set(line.productId, (requested.get(line.productId) ?? 0) + line.qty);
  const ordered = [...requested.entries()].sort(([a], [b]) => a.localeCompare(b));

  const db = await getDb();
  const result = await db.transaction(async (tx) => {
    const touched: Product[] = [];
    const shortages: Shortage[] = [];

    for (const [productId, qty] of ordered) {
      // Conditional decrement: succeeds only if enough stock remains at this instant.
      const { rows } = await tx.query(
        `UPDATE products SET stock = stock - $2, updated_at = now()
          WHERE id = $1 AND stock >= $2
      RETURNING ${PRODUCT_COLUMNS}`,
        [productId, qty],
      );
      if (rows.length > 0) {
        touched.push(toProduct(rows[0]));
        continue;
      }
      const current = await tx.query<{ name: string; stock: number }>(
        "SELECT name, stock FROM products WHERE id = $1",
        [productId],
      );
      const row = current.rows[0];
      shortages.push({ productId, name: row?.name ?? "Removed product", requested: qty, available: row?.stock ?? 0 });
    }

    // Throwing inside the transaction rolls back every decrement above.
    if (shortages.length > 0) {
      throw new HttpError(409, "insufficient_stock", "Some items don't have enough stock.", undefined, { shortages });
    }

    const byId = new Map(touched.map((p) => [p.id, p]));
    const lines: SaleLine[] = input.lines
      .filter((l, i, all) => all.findIndex((x) => x.productId === l.productId) === i)
      .map((l) => {
        const product = byId.get(l.productId)!;
        const qty = requested.get(l.productId)!;
        return {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unitPrice: product.price,
          qty,
          lineTotal: product.price * qty,
        };
      });

    const totals = computeTotals(lines, input.discountPercent);
    const paid = input.paymentMethod === "cash" ? input.paid : totals.total;
    if (paid < totals.total) {
      throw new HttpError(400, "payment_short", "Amount received is less than the total.", { paid: "invalid" });
    }

    const saleId = randomUUID();
    await tx.query(
      `INSERT INTO sales (id, number, subtotal, discount_percent, discount_amount, tax, total, paid, change_due, payment_method)
       VALUES ($1, 'S-' || lpad(nextval('sale_number_seq')::text, 5, '0'), $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        saleId,
        totals.subtotal,
        input.discountPercent,
        totals.discountAmount,
        totals.tax,
        totals.total,
        paid,
        paid - totals.total,
        input.paymentMethod,
      ],
    );
    for (const [index, l] of lines.entries()) {
      await tx.query(
        `INSERT INTO sale_lines (sale_id, line_no, product_id, sku, name, unit_price, qty, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [saleId, index + 1, l.productId, l.sku, l.name, l.unitPrice, l.qty, l.lineTotal],
      );
    }

    const sale = await tx.query(`${SALE_SELECT} WHERE s.id = $1 GROUP BY s.id`, [saleId]);
    return { sale: toSale(sale.rows[0]), products: touched };
  });

  // The touched products let the client update its normalised store in one pass.
  res.status(201).json(result);
});
