/**
 * Applies pending Drizzle migrations.
 *
 * We do not use `drizzle-kit migrate`: drizzle.config.ts declares
 * `dialect: "turso"` (the deployment target), and drizzle-kit's turso driver
 * exits 1 without a message when pointed at a local `file:` URL. The drizzle-orm
 * migrator talks to @libsql/client directly, so the same command works against
 * both the local dev file and a remote Turso database.
 *
 * Safety: defaults to the local dev database. `.env` normally holds the
 * production DATABASE_URL, so targeting the remote is opt-in via `--remote`
 * (`npm run db:migrate:remote`) rather than something a routine command does.
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const LOCAL_URL = "file:sqlite.db";
const remote = process.argv.includes("--remote");

if (remote && !process.env.DATABASE_URL) {
  console.error("--remote requires DATABASE_URL to be set.");
  process.exit(1);
}

const url = remote ? process.env.DATABASE_URL : LOCAL_URL;
const client = createClient({
  url,
  authToken: remote ? process.env.TURSO_AUTH_TOKEN : undefined,
});

console.log(`Applying migrations to ${remote ? "REMOTE " : "local "}${url}`);
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
console.log("Migrations applied.");

client.close();
