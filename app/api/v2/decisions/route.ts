import { createDecisionOrchestrator } from "@/features/decision/orchestration";
import { decisionRepository } from "@/features/decision/persistence";
import {
  createDecisionPostHandler,
  createOrchestratorTransportRunner,
} from "@/features/decision/transport";
import { resolveDecisionSession } from "@/features/decision/transport/server-session";
import type { EvidenceProvider } from "@/features/evidence/providers/evidence-provider";
import { RagflowEvidenceProvider } from "@/features/evidence/providers/ragflow-provider";
import { DeepSeekProvider } from "@/lib/ai/providers/deepseek-provider";

export const maxDuration = 120;

class DecisionSessionUnavailableError extends Error {
  constructor() {
    super("Decision session is unavailable.");
    this.name = "DecisionSessionUnavailableError";
  }
}

function configuredEvidenceProviders(): EvidenceProvider[] {
  const ragflowApiKey = process.env.RAGFLOW_API_KEY?.trim();
  const ragflowDatasetIds = (process.env.RAGFLOW_DATASET_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return ragflowApiKey && ragflowDatasetIds.length > 0
    ? [new RagflowEvidenceProvider()]
    : [];
}

const orchestrator = createDecisionOrchestrator({
  aiProvider: new DeepSeekProvider(),
  evidenceProviders: configuredEvidenceProviders(),
  repository: decisionRepository,
});

const runner = createOrchestratorTransportRunner(orchestrator);

function withSessionCookie(response: Response, setCookie?: string): Response {
  if (!setCookie) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.append("set-cookie", setCookie);
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function sessionUnavailableResponse(): Response {
  return Response.json(
    {
      error: {
        code: "session_unavailable",
        message: "Decision session is temporarily unavailable.",
      },
    },
    { status: 503 }
  );
}

export async function POST(request: Request): Promise<Response> {
  let setCookie: string | undefined;

  const handler = createDecisionPostHandler({
    resolveUserId: async (sessionRequest) => {
      const session = await resolveDecisionSession(sessionRequest);
      if (!session) {
        throw new DecisionSessionUnavailableError();
      }
      setCookie = session.setCookie;
      return session.userId;
    },
    runner,
  });

  try {
    const response = await handler(request);
    return withSessionCookie(response, setCookie);
  } catch (error) {
    if (error instanceof DecisionSessionUnavailableError) {
      return sessionUnavailableResponse();
    }
    throw error;
  }
}
