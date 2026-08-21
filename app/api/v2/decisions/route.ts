import { getToken } from "next-auth/jwt";
import {
  createDecisionPostHandler,
  type DecisionTransportRunner,
} from "@/features/decision/transport";

export const maxDuration = 120;

async function resolveUserId(request: Request): Promise<string | null> {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    return null;
  }

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

const unavailableRunner: DecisionTransportRunner = async () => {
  throw Object.assign(new Error("Decision orchestrator is not available."), {
    code: "orchestrator_unavailable",
    retryable: true,
  });
};

// V2-203 is intentionally safe while V2-201 is still unmerged. Replace this
// runner with the public V2-201 orchestrator adapter after that API lands.
export const POST = createDecisionPostHandler({
  resolveUserId,
  runner: unavailableRunner,
});
