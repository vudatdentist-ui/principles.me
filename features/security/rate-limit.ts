import { createHash } from "node:crypto";
import { db } from "@/lib/db/client";

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly count: number;
  readonly limit: number;
  readonly retryAfterSeconds: number;
}

export async function consumeRateLimit(input: {
  action: string;
  limit: number;
  scopeKey: string;
  windowSeconds: number;
  now?: Date;
}): Promise<RateLimitResult> {
  const now = input.now ?? new Date();
  const windowMs = input.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const rows = await db()`
    INSERT INTO rate_limit_buckets (scope_key, action, window_start, count)
    VALUES (${input.scopeKey}, ${input.action}, ${windowStart}, 1)
    ON CONFLICT (scope_key, action, window_start)
    DO UPDATE SET count = rate_limit_buckets.count + 1, updated_at = now()
    RETURNING count
  `;
  const count = Number(rows[0]?.count ?? 1);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStart.getTime() + windowMs - now.getTime()) / 1000)
  );
  return {
    allowed: count <= input.limit,
    count,
    limit: input.limit,
    retryAfterSeconds,
  };
}

export function workspaceRateScope(workspaceId: string): string {
  return `workspace:${workspaceId}`;
}

function requestIp(request: Request): string {
  // Traefik appends the immediate client/proxy hop to X-Forwarded-For.
  // Prefer the last hop so attacker-controlled leading values or X-Real-IP
  // cannot create arbitrary rate-limit buckets.
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const forwardedIp = forwarded?.at(-1);
  if (forwardedIp) {
    return forwardedIp;
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function authRateScope(request: Request): string {
  return `auth-ip:${createHash("sha256").update(requestIp(request)).digest("hex")}`;
}
