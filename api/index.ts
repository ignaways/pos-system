/**
 * Vercel Function entry. Every /api/* request is rewritten here (see vercel.json),
 * and Express routes it exactly as it does locally. The app reads DATABASE_URL,
 * which the Neon integration sets on the Vercel project.
 */
import app from "../server/src/app.js";

export default app;
