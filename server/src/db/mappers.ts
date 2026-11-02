import type { Category, Product, Sale, SaleLine } from "../types.js";

const iso = (value: unknown) => (value instanceof Date ? value : new Date(String(value))).toISOString();

export const PRODUCT_COLUMNS =
  "id, sku, name, category_id, price, stock, low_stock_threshold, updated_at";

export function toProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    sku: String(row.sku),
    name: String(row.name),
    categoryId: String(row.category_id),
    price: Number(row.price),
    stock: Number(row.stock),
    lowStockThreshold: Number(row.low_stock_threshold),
    updatedAt: iso(row.updated_at),
  };
}

export function toCategory(row: Record<string, unknown>): Category {
  return { id: String(row.id), name: String(row.name) };
}

/** Sales are read with their lines aggregated as JSON in one query (see routes/sales.ts). */
export function toSale(row: Record<string, unknown>): Sale {
  const rawLines = typeof row.lines === "string" ? JSON.parse(row.lines) : (row.lines ?? []);
  return {
    id: String(row.id),
    number: String(row.number),
    createdAt: iso(row.created_at),
    lines: (rawLines as Record<string, unknown>[]).map(
      (l): SaleLine => ({
        productId: String(l.productId),
        sku: String(l.sku),
        name: String(l.name),
        unitPrice: Number(l.unitPrice),
        qty: Number(l.qty),
        lineTotal: Number(l.lineTotal),
      }),
    ),
    subtotal: Number(row.subtotal),
    discountPercent: Number(row.discount_percent),
    discountAmount: Number(row.discount_amount),
    tax: Number(row.tax),
    total: Number(row.total),
    paid: Number(row.paid),
    change: Number(row.change_due),
    paymentMethod: row.payment_method as Sale["paymentMethod"],
  };
}
