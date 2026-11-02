import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { toCategory } from "../db/mappers.js";
import { HttpError, PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION, pgErrorCode } from "../http.js";
import { parseBody } from "../validate.js";

const categoryInput = z.object({ name: z.string().trim().min(1).max(60) });

function mapWriteError(err: unknown): never {
  if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
    throw new HttpError(409, "category_name_taken", "A category with this name already exists.", { name: "taken" });
  }
  throw err;
}

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res) => {
  const db = await getDb();
  const { rows } = await db.query("SELECT id, name FROM categories ORDER BY name");
  res.json(rows.map(toCategory));
});

categoriesRouter.post("/", async (req, res) => {
  const input = parseBody(categoryInput, req.body);
  const db = await getDb();
  const { rows } = await db
    .query("INSERT INTO categories (id, name) VALUES ($1, $2) RETURNING id, name", [randomUUID(), input.name])
    .catch(mapWriteError);
  res.status(201).json(toCategory(rows[0]));
});

categoriesRouter.put("/:id", async (req, res) => {
  const input = parseBody(categoryInput, req.body);
  const db = await getDb();
  const { rows } = await db
    .query("UPDATE categories SET name = $2 WHERE id = $1 RETURNING id, name", [req.params.id, input.name])
    .catch(mapWriteError);
  if (rows.length === 0) throw new HttpError(404, "category_not_found", "Category not found.");
  res.json(toCategory(rows[0]));
});

categoriesRouter.delete("/:id", async (req, res) => {
  const db = await getDb();
  try {
    const { rowCount } = await db.query("DELETE FROM categories WHERE id = $1", [req.params.id]);
    if (rowCount === 0) throw new HttpError(404, "category_not_found", "Category not found.");
  } catch (err) {
    // The FK (ON DELETE RESTRICT) is the real guard; the count is only for the message.
    if (pgErrorCode(err) !== PG_FOREIGN_KEY_VIOLATION) throw err;
    const { rows } = await db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM products WHERE category_id = $1",
      [req.params.id],
    );
    const count = rows[0].n;
    throw new HttpError(409, "category_in_use", `Move or delete the ${count} product(s) in this category first.`, undefined, {
      count,
    });
  }
  res.status(204).end();
});
