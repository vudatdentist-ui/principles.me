import {
  assertTrustedOrigin,
  UntrustedOriginError,
} from "@/features/auth/origin";
import {
  requireSession,
  UnauthorizedError,
} from "@/features/auth/session";
import type { SessionContext } from "@/features/auth/contracts";
import {
  consumeRateLimit,
  workspaceRateScope,
} from "@/features/security/rate-limit";

export async function requirePeopleSession(request: Request): Promise<SessionContext> {
  return requireSession(request);
}

export async function requirePeopleMutation(request: Request): Promise<SessionContext> {
  assertTrustedOrigin(request);
  return requireSession(request);
}

export async function consumePeopleAiQuota(
  context: SessionContext,
  action = "people.ai"
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  return consumeRateLimit({
    action,
    limit: Number(process.env.PEOPLE_AI_REQUESTS_PER_HOUR || 30),
    scopeKey: workspaceRateScope(context.workspace.id),
    windowSeconds: 60 * 60,
  });
}

export function peopleApiError(error: unknown, fallback = "Request failed."): Response {
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (error instanceof UntrustedOriginError) {
    return Response.json({ error: "Request rejected." }, { status: 403 });
  }
  console.error(JSON.stringify({ event: "people_api_failed" }));
  return Response.json({ error: fallback }, { status: 500 });
}

export function quotaResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "AI usage limit reached." },
    {
      headers: { "retry-after": String(retryAfterSeconds) },
      status: 429,
    }
  );
}
