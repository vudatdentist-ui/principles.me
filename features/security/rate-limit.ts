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

export function authRateScope(request: Request, email: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `auth:${createHash("sha256")
    .update(`${ip}|${email.trim().toLowerCase()}`)
    .digest("hex")}`;
}
