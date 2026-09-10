// Replay every migration against a scratch Postgres database to prove they
// apply cleanly, without needing Docker or the Supabase CLI.
//
// Local Supabase needs Docker, which needs WSL2 and hardware virtualisation.
// On a machine without those, this is the way to check a migration is valid
// before it reaches a real database. It stubs the Supabase-managed objects the
// migrations reference (the auth schema, auth.uid(), the anon/authenticated/
// service_role roles) and then runs the migrations in filename order.
//
//   node scripts/validate-migrations.mjs
//
// psql prompts for the postgres password. Set PGPASSWORD to skip the prompt.
// Override the binary with PSQL, the target database with MIGRATION_CHECK_DB.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const DATABASE = process.env.MIGRATION_CHECK_DB ?? "dobly_migration_check";

/** Extensions that ship with a stock PostgreSQL install. */
const STOCK_EXTENSIONS = new Set(["uuid-ossp", "pgcrypto", "citext", "hstore", "ltree", "unaccent"]);

function findPsql() {
  if (process.env.PSQL) return process.env.PSQL;
  const onPath = spawnSync("psql", ["--version"], { encoding: "utf8" });
  if (!onPath.error) return "psql";
  for (const version of ["17", "16", "15", "14"]) {
    const candidate = `C:\\Program Files\\PostgreSQL\\${version}\\bin\\psql.exe`;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Supabase-managed objects the migrations assume exist. auth.users is a real
 * table here because 26 foreign keys point at it.
 */
const STUBS = `
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default uuid_generate_v4(),
  email text
);

-- Stubs: the real implementations read the request JWT.
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select 'authenticated'::text $$;
`;

/** Extensions a migration needs that this server cannot provide. */
function missingExtensions(sql) {
  const needed = [...sql.matchAll(/create\s+extension\s+(?:if\s+not\s+exists\s+)?"?([a-z0-9_-]+)"?/gi)].map(
    (match) => match[1].toLowerCase(),
  );
  return [...new Set(needed)].filter((name) => !STOCK_EXTENSIONS.has(name));
}

const psql = findPsql();
if (!psql) {
  console.error("Could not find psql. Install PostgreSQL or set PSQL to its path.");
  process.exit(1);
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (!files.length) {
  console.error(`No migrations found in ${MIGRATIONS_DIR}`);
  process.exit(1);
}

const applied = [];
const skipped = [];
const parts = [
  `\\set ON_ERROR_STOP on`,
  `drop database if exists ${DATABASE};`,
  `create database ${DATABASE};`,
  `\\connect ${DATABASE}`,
  `\\echo '>>> stubs'`,
  STUBS,
];

for (const name of files) {
  const sql = readFileSync(join(MIGRATIONS_DIR, name), "utf8");
  const missing = missingExtensions(sql);
  if (missing.length) {
    skipped.push({ name, missing });
    continue;
  }
  applied.push(name);
  // The echo marker is how a failure in the combined script is traced back to
  // the migration that caused it.
  parts.push(`\\echo '>>> ${name}'`, sql);
}

parts.push(`\\echo '>>> ALL MIGRATIONS APPLIED'`);

const outDir = join(tmpdir(), "dobly-migration-check");
mkdirSync(outDir, { recursive: true });
const combinedPath = join(outDir, "combined.sql");
writeFileSync(combinedPath, parts.join("\n\n"), "utf8");

if (skipped.length) {
  console.log("Skipped (extension unavailable on this server):");
  for (const entry of skipped) console.log(`  ${entry.name} -> needs ${entry.missing.join(", ")}`);
  console.log("");
}

console.log(`Applying ${applied.length} migrations to database "${DATABASE}"...\n`);

const result = spawnSync(
  psql,
  ["-U", process.env.PGUSER ?? "postgres", "-h", process.env.PGHOST ?? "localhost",
   "-p", process.env.PGPORT ?? "5432", "-v", "ON_ERROR_STOP=1", "-f", combinedPath],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  console.error(`\nMigration replay FAILED. The last '>>> <file>' line above names the migration that broke.`);
  console.error(`Combined script: ${combinedPath}`);
  process.exit(result.status ?? 1);
}

console.log(`\nAll ${applied.length} migrations applied cleanly to "${DATABASE}".`);
if (skipped.length) {
  console.log(`${skipped.length} migration(s) were skipped and remain unverified: ${skipped.map((entry) => entry.name).join(", ")}`);
}
