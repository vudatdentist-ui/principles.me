#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

function databaseUrl(env = process.env) {
  if (env.DATABASE_URL?.trim()) {
    return env.DATABASE_URL.trim();
  }

  const password = env.POSTGRES_PASSWORD?.trim();
  if (!password) {
    throw new Error("DATABASE_URL or POSTGRES_PASSWORD is required.");
  }

  const user = env.POSTGRES_USER?.trim() || "principles";
  const host = env.POSTGRES_HOST?.trim() || "127.0.0.1";
  const port = env.POSTGRES_PORT?.trim() || "5432";
  const database = env.POSTGRES_DB?.trim() || "principles";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

const migrationsDirectory = path.resolve(process.cwd(), "db/migrations");
const sql = postgres(databaseUrl(), {
  connect_timeout: 10,
  max: 1,
  prepare: false,
});

try {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const existing = await sql`
      SELECT id FROM schema_migrations WHERE id = ${file} LIMIT 1
    `;
    if (existing.length > 0) {
      continue;
    }

    const migration = await readFile(path.join(migrationsDirectory, file), "utf8");
    await sql.begin(async (transaction) => {
      await transaction.unsafe(migration);
      await transaction`
        INSERT INTO schema_migrations (id) VALUES (${file})
      `;
    });
    console.log(`MIGRATION_APPLIED=${file}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
