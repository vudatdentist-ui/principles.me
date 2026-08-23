import type { SessionContext } from "./contracts";
import { sessionContext } from "./repository";

export const SESSION_COOKIE = "principles_session";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${secure}`;
}

export function clearedSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function sessionTokenFromCookieHeader(header: string | null): string | null {
  if (!header) {
    return null;
  }
  for (const item of header.split(";")) {
    const [name, ...rest] = item.trim().split("=");
    if (name === SESSION_COOKIE) {
      const value = rest.join("=");
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

export async function optionalSession(request: Request): Promise<SessionContext | null> {
  const token = sessionTokenFromCookieHeader(request.headers.get("cookie"));
  return token ? sessionContext(token) : null;
}

export async function requireSession(request: Request): Promise<SessionContext> {
  const context = await optionalSession(request);
  if (!context) {
    throw new UnauthorizedError();
  }
  return context;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "UnauthorizedError";
  }
}
