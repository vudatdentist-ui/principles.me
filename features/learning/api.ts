import type { SessionContext } from "@/features/auth/contracts";
import {
  assertTrustedOrigin,
  UntrustedOriginError,
} from "@/features/auth/origin";
import {
  requireSession,
  UnauthorizedError,
} from "@/features/auth/session";
import {
  consumeRateLimit,
  workspaceRateScope,
} from "@/features/security/rate-limit";

export async function requireLearningSession(
  request: Request
): Promise<SessionContext> {
  return requireSession(request);
}

export async function requireLearningMutation(
  request: Request
): Promise<SessionContext> {
  assertTrustedOrigin(request);
  return requireSession(request);
}

export async function consumeLearningAiQuota(
  context: SessionContext,
  action = "learning.pattern_proposal"
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  return consumeRateLimit({
    action,
    limit: Number(process.env.LEARNING_AI_REQUESTS_PER_HOUR || 12),
    scopeKey: workspaceRateScope(context.workspace.id),
    windowSeconds: 60 * 60,
  });
}

export function learningApiError(
  error: unknown,
  fallback = "Request failed."
): Response {
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (error instanceof UntrustedOriginError) {
    return Response.json({ error: "Request rejected." }, { status: 403 });
  }
  console.error(JSON.stringify({ event: "learning_api_failed" }));
  return Response.json({ error: fallback }, { status: 500 });
}

export function learningQuotaResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "AI usage limit reached." },
    {
      headers: { "retry-after": String(retryAfterSeconds) },
      status: 429,
    }
  );
}
