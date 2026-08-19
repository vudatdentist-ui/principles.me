import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: process.env.ENV_FILE || ".env.local" });

async function runMigrate() {
  const databaseUrl = process.env.POSTGRES_URL?.trim();
  if (!databaseUrl) {
    throw new Error("POSTGRES_URL_REQUIRED");
  }

  const connection = postgres(databaseUrl, { max: 1 });
  try {
    const db = drizzle(connection);
    const start = Date.now();
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: "./lib/db/migrations" });
    console.log("Migrations completed in", Date.now() - start, "ms");
  } finally {
    await connection.end({ timeout: 5 });
  }
}

runMigrate().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      code: error instanceof Error ? error.name : "MIGRATION_FAILED",
      event: "app_error",
      kind: "migration",
      stage: "db:migrate",
      timestamp: new Date().toISOString(),
    })
  );
  process.exitCode = 1;
});
