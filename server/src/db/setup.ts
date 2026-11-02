import { seedCategories, seedProducts } from "../seed.js";
import type { Database, Queryable } from "./client.js";
import { SCHEMA_SQL } from "./schema.js";

export async function migrate(db: Database) {
  await db.exec(SCHEMA_SQL);
}

async function insertSeed(tx: Queryable) {
  for (const c of seedCategories) {
    await tx.query("INSERT INTO categories (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING", [c.id, c.name]);
  }
  for (const p of seedProducts) {
    await tx.query(
      `INSERT INTO products (id, sku, name, category_id, price, stock, low_stock_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
      [p.id, p.sku, p.name, p.categoryId, p.price, p.stock, p.lowStockThreshold],
    );
  }
}

/** Creates tables and loads demo data only if the catalogue is empty. Safe to run repeatedly. */
export async function setup(db: Database) {
  await migrate(db);
  const { rows } = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM categories");
  if (rows[0].n === 0) await db.transaction(insertSeed);
  return { seeded: rows[0].n === 0 };
}

/** Wipes everything and restores the demo catalogue. */
export async function resetData(db: Database) {
  await migrate(db);
  await db.transaction(async (tx) => {
    await tx.query("TRUNCATE sale_lines, sales, products, categories");
    await tx.query("ALTER SEQUENCE sale_number_seq RESTART WITH 1");
    await insertSeed(tx);
  });
}
