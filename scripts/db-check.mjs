// Quick connectivity check against Neon.
// Run: node --env-file=.env.local scripts/db-check.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`select version() as version, current_database() as db, now() as now`;
console.log("✅ Neon connection OK");
console.log("   database:", rows[0].db);
console.log("   time:    ", rows[0].now);
console.log("   version: ", rows[0].version.split(",")[0]);
