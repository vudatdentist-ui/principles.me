import postgres, { type Sql } from "postgres";
import { databaseUrl } from "./config";

let client: Sql | null = null;

export function db(): Sql {
  if (!client) {
    client = postgres(databaseUrl(), {
      connect_timeout: 10,
      idle_timeout: 20,
      max: Number(process.env.POSTGRES_POOL_MAX || 8),
      prepare: false,
    });
  }
  return client;
}

export async function closeDatabaseForTests(): Promise<void> {
  if (!client) {
    return;
  }
  const active = client;
  client = null;
  await active.end({ timeout: 5 });
}
