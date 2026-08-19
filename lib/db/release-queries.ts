import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { decision } from "./schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

export async function deleteDecisionForUser({
  decisionId,
  userId,
}: {
  decisionId: string;
  userId: string;
}) {
  const deleted = await db
    .delete(decision)
    .where(and(eq(decision.id, decisionId), eq(decision.userId, userId)))
    .returning({ id: decision.id });
  return deleted.length === 1;
}

export async function checkDatabaseReady() {
  await db.execute(sql`select 1`);
}
