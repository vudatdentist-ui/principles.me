import { db } from "./client";

const REQUIRED_SCHEMA_MIGRATION = "0006_organization_kernel_loop.sql";

export async function databaseHealth(): Promise<{
  reachable: boolean;
  schemaReady: boolean;
}> {
  try {
    const sql = db();
    await sql`SELECT 1 AS ok`;
    const migrations = await sql`
      SELECT id
      FROM schema_migrations
      WHERE
        id = ${REQUIRED_SCHEMA_MIGRATION}
        AND checksum IS NOT NULL
      LIMIT 1
    `;
    return { reachable: true, schemaReady: migrations.length === 1 };
  } catch {
    return { reachable: false, schemaReady: false };
  }
}
