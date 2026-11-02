import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { PRODUCT_COLUMNS, toProduct } from "../db/mappers.js";
import {
  HttpError,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  pgConstraint,
  pgErrorCode,
} from "../http.js";
import { parseBody } from "../validate.js";

const count = (max: number) => z.number().int().min(0).max(max);

const productInput = z.object({
  sku: z.string().trim().toUpperCase().pipe(z.string().min(1).max(32)),
  name: z.string().trim().min(1).max(80),
  categoryId: z.string().min(1),
  price: count(100_000_000),
  stock: count(1_000_000),
  lowStockThreshold: count(1_000_000).default(5),
});

function mapWriteError(err: unknown): never {
  const code = pgErrorCode(err);
  if (code === PG_UNIQUE_VIOLATION && pgConstraint(err).includes("sku")) {
    throw new HttpError(409, "sku_taken", "Another product already uses this SKU.", { sku: "taken" });
  }
  if (code === PG_FOREIGN_KEY_VIOLATION) {
    throw new HttpError(400, "category_missing", "That category no longer exists.", { categoryId: "invalid" });
  }
  throw err;
}

export const productsRouter = Router();

productsRouter.get("/", async (_req, res) => {
  const db = await getDb();
  const { rows } = await db.query(`SELECT ${PRODUCT_COLUMNS} FROM products ORDER BY name`);
  res.json(rows.map(toProduct));
});

productsRouter.post("/", async (req, res) => {
  const p = parseBody(productInput, req.body);
  const db = await getDb();
  const { rows } = await db
    .query(
      `INSERT INTO products (id, sku, name, category_id, price, stock, low_stock_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${PRODUCT_COLUMNS}`,
      [randomUUID(), p.sku, p.name, p.categoryId, p.price, p.stock, p.lowStockThreshold],
    )
    .catch(mapWriteError);
  res.status(201).json(toProduct(rows[0]));
});

productsRouter.put("/:id", async (req, res) => {
  const p = parseBody(productInput, req.body);
  const db = await getDb();
  const { rows } = await db
    .query(
      `UPDATE products
          SET sku = $2, name = $3, category_id = $4, price = $5, stock = $6,
              low_stock_threshold = $7, updated_at = now()
        WHERE id = $1
    RETURNING ${PRODUCT_COLUMNS}`,
      [req.params.id, p.sku, p.name, p.categoryId, p.price, p.stock, p.lowStockThreshold],
    )
    .catch(mapWriteError);
  if (rows.length === 0) throw new HttpError(404, "product_not_found", "Product not found.");
  res.json(toProduct(rows[0]));
});

productsRouter.delete("/:id", async (req, res) => {
  const db = await getDb();
  // Past sales keep their own snapshot of each line, so deleting is safe.
  const { rowCount } = await db.query("DELETE FROM products WHERE id = $1", [req.params.id]);
  if (rowCount === 0) throw new HttpError(404, "product_not_found", "Product not found.");
  res.status(204).end();
});
