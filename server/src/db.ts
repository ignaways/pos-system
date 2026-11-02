import fs from "node:fs";
import path from "node:path";
import { createSeed } from "./seed.js";
import type { DbShape } from "./types.js";

/**
 * A deliberately small persistence layer: one JSON file, written atomically.
 * Routes only touch `db` + `persist()`, so swapping in Postgres/SQL Server later
 * means replacing this module, not the route handlers' contracts.
 */
const DATA_FILE = process.env.DATA_FILE ?? path.resolve(process.cwd(), "data", "db.json");

function write(data: DbShape) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function load(): DbShape {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as DbShape;
  } catch {
    const seed = createSeed();
    write(seed);
    return seed;
  }
}

export const db: DbShape = load();

export function persist() {
  write(db);
}

export function resetDb() {
  Object.assign(db, createSeed());
  persist();
}
