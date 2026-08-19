import "server-only";

import { cookies } from "next/headers";
import {
  INTERNAL_SESSION_COOKIE,
  internalAuthRequired,
  isInternalEmailAllowed,
  signInternalSession,
  verifyInternalSession,
} from "./session-token";

const TWO_WEEKS = 60 * 60 * 24 * 14;

export class WorkspaceAuthenticationError extends Error {
  constructor() {
    super("Internal authentication required.");
    this.name = "WorkspaceAuthenticationError";
  }
}

export function assertInternalAuthConfigured() {
  if (!internalAuthRequired()) {
    return;
  }
  if (!process.env.AUTH_SECRET?.trim()) {
    throw new Error("AUTH_SECRET is required when internal auth is enabled.");
  }
  if (!process.env.INTERNAL_AUTH_EMAILS?.trim()) {
    throw new Error(
      "INTERNAL_AUTH_EMAILS is required when internal auth is enabled."
    );
  }
}

export async function readInternalSession() {
  assertInternalAuthConfigured();
  const cookieStore = await cookies();
  const payload = await verifyInternalSession(
    cookieStore.get(INTERNAL_SESSION_COOKIE)?.value,
    process.env.AUTH_SECRET?.trim()
  );
  if (!payload || !isInternalEmailAllowed(payload.email)) {
    return null;
  }
  return payload;
}

export async function createInternalSession({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  assertInternalAuthConfigured();
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is required to create an internal session.");
  }
  const cookieStore = await cookies();
  const token = await signInternalSession({ email, secret, userId });
  cookieStore.set(INTERNAL_SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: TWO_WEEKS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearInternalSession() {
  const cookieStore = await cookies();
  cookieStore.set(INTERNAL_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export { internalAuthRequired };
