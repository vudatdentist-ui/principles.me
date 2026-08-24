#!/usr/bin/env node

import { createHash } from "node:crypto";
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

function checksum(content) {
  return createHash("sha256").update(content).digest("hex");
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
      checksum text,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum text`;

  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const migration = await readFile(path.join(migrationsDirectory, file), "utf8");
    const migrationChecksum = checksum(migration);
    const existing = await sql`
      SELECT id, checksum FROM schema_migrations WHERE id = ${file} LIMIT 1
    `;
    if (existing.length > 0) {
      const appliedChecksum = existing[0]?.checksum;
      if (!appliedChecksum || String(appliedChecksum) !== migrationChecksum) {
        throw new Error(`Migration checksum mismatch: ${file}`);
      }
      continue;
    }

    await sql.begin(async (transaction) => {
      await transaction.unsafe(migration);
      await transaction`
        INSERT INTO schema_migrations (id, checksum)
        VALUES (${file}, ${migrationChecksum})
      `;
    });
    console.log(`MIGRATION_APPLIED=${file}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
