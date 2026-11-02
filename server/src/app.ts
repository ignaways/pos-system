import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { getDb } from "./db/client.js";
import { resetData } from "./db/setup.js";
import { HttpError } from "./http.js";
import { categoriesRouter } from "./routes/categories.js";
import { productsRouter } from "./routes/products.js";
import { salesRouter } from "./routes/sales.js";

/**
 * The Express app without `listen()`. Imported by:
 *  - src/index.ts   for local development / `npm start`
 *  - ../api/index.ts as a Vercel Function
 */
const app = express();

/** Lets portfolio visitors restore the demo catalogue. On by default locally, opt-in on Vercel. */
export const demoResetEnabled = () =>
  process.env.ALLOW_DEMO_RESET === "true" || (!process.env.VERCEL && process.env.NODE_ENV !== "production");

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", async (_req, res) => {
  const db = await getDb();
  await db.query("SELECT 1");
  res.json({ ok: true, database: db.kind, demoReset: demoResetEnabled() });
});

app.use("/api/categories", categoriesRouter);
app.use("/api/products", productsRouter);
app.use("/api/sales", salesRouter);

app.post("/api/demo/reset", async (_req, res) => {
  if (!demoResetEnabled()) throw new HttpError(403, "demo_reset_disabled", "Demo reset is turned off.");
  await resetData(await getDb());
  res.status(204).end();
});

app.use("/api", (_req, res) => {
  res.status(404).json({ code: "endpoint_not_found", error: "Endpoint not found." });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ code: err.code, error: err.message, fields: err.fields, details: err.details });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ code: "invalid_json", error: "Request body isn't valid JSON." });
    return;
  }
  console.error(err);
  const message = String(err?.message ?? "");
  if (/DATABASE_URL|ECONNREFUSED|ENOTFOUND|connect|password authentication/i.test(message)) {
    res.status(503).json({ code: "database_unavailable", error: "The database isn't reachable." });
    return;
  }
  res.status(500).json({ code: "server_error", error: "Unexpected server error." });
};
app.use(errorHandler);

export default app;
