export const INTERNAL_SESSION_COOKIE = "principles-session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export type InternalSessionPayload = {
  email: string;
  exp: number;
  iat: number;
  userId: string;
};

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/[=]+$/g, "");
}

function decodeBase64Url(value: string) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"]
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value))
  );
}

function sameBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export function internalAuthRequired() {
  const explicit = process.env.INTERNAL_AUTH_REQUIRED?.trim().toLowerCase();
  if (explicit === "true") {
    return true;
  }
  if (explicit === "false") {
    return false;
  }
  return ["staging", "production"].includes(
    process.env.APP_ENV?.trim().toLowerCase() ?? ""
  );
}

export function internalAllowedEmails() {
  return new Set(
    (process.env.INTERNAL_AUTH_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isInternalEmailAllowed(email: string) {
  return internalAllowedEmails().has(email.trim().toLowerCase());
}

export async function signInternalSession({
  email,
  secret,
  userId,
}: {
  email: string;
  secret: string;
  userId: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: InternalSessionPayload = {
    email: email.trim().toLowerCase(),
    exp: now + SESSION_TTL_SECONDS,
    iat: now,
    userId,
  };
  const encodedPayload = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const signature = encodeBase64Url(await hmac(encodedPayload, secret));
  return `${encodedPayload}.${signature}`;
}

export async function verifyInternalSession(
  token: string | undefined,
  secret: string | undefined
): Promise<InternalSessionPayload | null> {
  if (!token || !secret) {
    return null;
  }
  const [encodedPayload, encodedSignature, ...rest] = token.split(".");
  if (!encodedPayload || !encodedSignature || rest.length) {
    return null;
  }
  try {
    const expected = await hmac(encodedPayload, secret);
    const provided = decodeBase64Url(encodedSignature);
    if (!sameBytes(expected, provided)) {
      return null;
    }
    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(encodedPayload))
    ) as Partial<InternalSessionPayload>;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.exp <= now ||
      payload.iat > now + 60
    ) {
      return null;
    }
    return payload as InternalSessionPayload;
  } catch {
    return null;
  }
}
