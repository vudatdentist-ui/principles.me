import "server-only";

import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { user } from "../schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const sessionDb = drizzle(client);

export type V2GuestIdentity = {
  id: string;
};

export async function createV2GuestIdentity(): Promise<V2GuestIdentity | null> {
  const [guest] = await sessionDb
    .insert(user)
    .values({
      email: `guest-${randomUUID()}`,
      isAnonymous: true,
    })
    .returning({ id: user.id });

  return guest ?? null;
}
