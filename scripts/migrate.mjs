// Apply Drizzle migrations to Neon.
// Run: node --env-file=.env.local scripts/migrate.mjs
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DIRECT_URL/DATABASE_URL not set (add to .env.local).");

const db = drizzle(neon(url));
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("✅ Migrations applied");
