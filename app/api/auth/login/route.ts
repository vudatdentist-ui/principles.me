import { compareSync } from "bcrypt-ts";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getInternalUsersByEmail } from "@/lib/db/internal-auth-queries";
import { createInternalSession } from "@/lib/internal-auth";
import { isInternalEmailAllowed } from "@/lib/session-token";

const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(256),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const email = parsed.data.email.toLowerCase();
  if (!isInternalEmailAllowed(email)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const users = await getInternalUsersByEmail(email);
  const selectedUser = users.length === 1 ? users[0] : null;
  if (
    !selectedUser ||
    selectedUser.isAnonymous ||
    !selectedUser.password ||
    !compareSync(parsed.data.password, selectedUser.password)
  ) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  await createInternalSession({ email, userId: selectedUser.id });
  return NextResponse.json({ email, ok: true });
}
