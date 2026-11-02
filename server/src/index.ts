import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import app from "./app.js";
import { getDb } from "./db/client.js";
import { setup } from "./db/setup.js";

/** Local entry point. On Vercel, ../api/index.ts imports the app directly instead. */
const PORT = Number(process.env.PORT) || 4000;

const db = await getDb();
const { seeded } = await setup(db);
console.log(`Database: ${db.kind === "postgres" ? "Postgres (DATABASE_URL)" : "local PGlite"}${seeded ? ", demo data loaded" : ""}`);

// `npm start` after `npm run build`: serve the built client from the same process.
const clientDist = fileURLToPath(new URL("../../client/dist", import.meta.url));
if (fs.existsSync(clientDist)) {
  const spa = express.Router();
  spa.use(express.static(clientDist));
  spa.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
  app.use(spa);
}

app.listen(PORT, () => {
  console.log(`POS API listening on http://localhost:${PORT}`);
});
