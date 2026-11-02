import { closeDb, getDb } from "./client.js";
import { resetData, setup } from "./setup.js";

const command = process.argv[2];
const db = await getDb();
const target = db.kind === "postgres" ? new URL(process.env.DATABASE_URL!).host : "local PGlite (./.pglite)";

try {
  if (command === "setup") {
    const { seeded } = await setup(db);
    console.log(`Schema ready on ${target}. ${seeded ? "Demo data loaded." : "Existing data kept."}`);
  } else if (command === "reset") {
    await resetData(db);
    console.log(`Data on ${target} reset to the demo catalogue.`);
  } else {
    console.error("Usage: tsx src/db/cli.ts <setup|reset>");
    process.exitCode = 1;
  }
} finally {
  await closeDb();
}
