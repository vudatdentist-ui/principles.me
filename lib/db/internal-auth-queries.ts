import "server-only";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { user } from "./schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

export function getInternalUsersByEmail(email: string) {
  return db
    .select()
    .from(user)
    .where(eq(user.email, email.trim().toLowerCase()))
    .limit(2);
}
