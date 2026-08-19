import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { user } from "@/lib/db/schema";
import { generateHashedPassword } from "@/lib/db/utils";

config({ path: process.env.ENV_FILE || ".env.local" });

async function main() {
  const databaseUrl = process.env.POSTGRES_URL?.trim();
  const email = process.env.INTERNAL_USER_EMAIL?.trim().toLowerCase();
  const password = process.env.INTERNAL_USER_PASSWORD ?? "";
  const name = process.env.INTERNAL_USER_NAME?.trim() || "Internal user";

  if (!databaseUrl || !email || password.length < 12) {
    throw new Error(
      "POSTGRES_URL, INTERNAL_USER_EMAIL and INTERNAL_USER_PASSWORD (12+ chars) are required."
    );
  }

  const connection = postgres(databaseUrl, { max: 1 });
  try {
    const db = drizzle(connection);
    const existing = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(2);
    if (existing.length > 1) {
      throw new Error(
        `Multiple users exist for ${email}; resolve duplicates first.`
      );
    }
    const passwordHash = generateHashedPassword(password);
    if (existing[0]) {
      await db
        .update(user)
        .set({
          emailVerified: true,
          isAnonymous: false,
          name,
          password: passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(user.id, existing[0].id));
      console.log(`Updated internal user ${email}.`);
      return;
    }
    await db.insert(user).values({
      email,
      emailVerified: true,
      isAnonymous: false,
      name,
      password: passwordHash,
    });
    console.log(`Created internal user ${email}.`);
  } finally {
    await connection.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Provisioning failed."
  );
  process.exitCode = 1;
});
