import pg from "pg";

/**
 * One small interface over two drivers:
 *  - DATABASE_URL set  -> node-postgres Pool (Neon in production, any Postgres locally)
 *  - DATABASE_URL unset -> PGlite, a real Postgres compiled to WASM, for zero-setup local dev and tests
 * Routes only see `query` and `transaction`, so the SQL is identical on both.
 */
export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface Queryable {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
}

export interface Database extends Queryable {
  readonly kind: "postgres" | "pglite";
  exec(sql: string): Promise<void>;
  transaction<R>(fn: (tx: Queryable) => Promise<R>): Promise<R>;
  close(): Promise<void>;
}

async function createPostgres(connectionString: string): Promise<Database> {
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    // Short idle timeout so suspended Vercel instances don't hold Neon connections.
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
  });

  if (process.env.VERCEL) {
    // Lets Vercel Fluid compute close idle clients before an instance is suspended.
    const { attachDatabasePool } = await import("@vercel/functions");
    attachDatabasePool(pool);
  }

  const run = async <T>(client: pg.Pool | pg.PoolClient, sql: string, params?: unknown[]) => {
    const result = await client.query(sql, params as unknown[] | undefined);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? result.rows.length };
  };

  return {
    kind: "postgres",
    query: (sql, params) => run(pool, sql, params),
    async exec(sql) {
      await pool.query(sql);
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn({ query: (sql, params) => run(client, sql, params) });
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

async function createPglite(dataDir: string | undefined): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(dataDir);
  await db.waitReady;

  type Runner = { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; affectedRows?: number }> };
  const run = async <T>(client: Runner, sql: string, params?: unknown[]) => {
    const result = await client.query(sql, params);
    return { rows: result.rows as T[], rowCount: result.affectedRows || result.rows.length };
  };

  return {
    kind: "pglite",
    query: (sql, params) => run(db, sql, params),
    async exec(sql) {
      await db.exec(sql);
    },
    transaction: (fn) => db.transaction((tx) => fn({ query: (sql, params) => run(tx, sql, params) })),
    close: () => db.close(),
  };
}

let instance: Promise<Database> | undefined;

export function getDb(): Promise<Database> {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (url) {
      instance = createPostgres(url);
    } else if (process.env.VERCEL) {
      // Never fall back to a local file on serverless: it would silently lose data.
      instance = Promise.reject(new Error("DATABASE_URL is not set. Connect a Neon database to this Vercel project."));
    } else {
      // PGLITE_DIR="memory://" for an in-memory database (tests).
      instance = createPglite(process.env.PGLITE_DIR ?? "./.pglite");
    }
    instance.catch(() => {
      instance = undefined; // allow a retry on the next request
    });
  }
  return instance;
}

export async function closeDb() {
  if (!instance) return;
  const db = await instance.catch(() => undefined);
  instance = undefined;
  await db?.close();
}
