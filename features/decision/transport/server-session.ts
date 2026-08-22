import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { createGuestUser } from "@/lib/db/queries";
import { getToken } from "next-auth/jwt";

const SESSION_COOKIE = "principles-v2-session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 365;

type SessionPayload = {
  exp: number;
  sub: string;
  v: 1;
};

export type DecisionSession = {
  setCookie?: string;
  userId: string;
};

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function encodeSession(userId: string, secret: string): string {
  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    sub: userId,
    v: 1,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

function verifySession(value: string, secret: string): string | null {
  const [encoded, signature, extra] = value.split(".");
  if (!(encoded && signature) || extra !== undefined) {
    return null;
  }

  const expected = sign(encoded, secret);
  const receivedBytes = Buffer.from(signature, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  if (
    receivedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(receivedBytes, expectedBytes)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<SessionPayload>;
    if (
      payload.v !== 1 ||
      typeof payload.sub !== "string" ||
      !payload.sub.trim() ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload.sub.trim();
  } catch {
    return null;
  }
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) {
    return null;
  }

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) {
      continue;
    }
    const key = part.slice(0, separator).trim();
    if (key !== name) {
      continue;
    }

    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function sessionCookie(request: Request, value: string): string {
  const secure = new URL(request.url).protocol === "https:";
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

async function nextAuthUserId(
  request: Request,
  secret: string
): Promise<string | null> {
  try {
    const token = await getToken({
      req: request,
      secret,
      secureCookie: new URL(request.url).protocol === "https:",
    });
    return typeof token?.sub === "string" && token.sub.trim()
      ? token.sub.trim()
      : null;
  } catch {
    return null;
  }
}

export async function resolveDecisionSession(
  request: Request
): Promise<DecisionSession | null> {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    return null;
  }

  const authenticatedUserId = await nextAuthUserId(request, secret);
  if (authenticatedUserId) {
    return { userId: authenticatedUserId };
  }

  const existing = readCookie(request, SESSION_COOKIE);
  if (existing) {
    const userId = verifySession(existing, secret);
    if (userId) {
      return { userId };
    }
  }

  const [guest] = await createGuestUser();
  if (!guest?.id) {
    return null;
  }

  return {
    setCookie: sessionCookie(request, encodeSession(guest.id, secret)),
    userId: guest.id,
  };
}
