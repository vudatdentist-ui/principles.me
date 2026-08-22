import type { DecisionTransportRunner } from "./event-adapter";
import { createDecisionNdjsonResponse } from "./ndjson-response";
import { parseDecisionRequest } from "./request-schema";
import { createDecisionStream } from "./decision-stream";

export type DecisionRouteDependencies = {
  resolveUserId: (request: Request) => Promise<string | null>;
  runner: DecisionTransportRunner;
};

type JsonError = {
  code: string;
  message: string;
};

function jsonError(status: number, error: JsonError): Response {
  return Response.json({ error }, { status });
}

export function createDecisionPostHandler({
  resolveUserId,
  runner,
}: DecisionRouteDependencies): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const parsed = await parseDecisionRequest(request);
    if (!parsed.ok) {
      return jsonError(400, {
        code: parsed.code,
        message: parsed.message,
      });
    }

    const userId = await resolveUserId(request);
    if (!userId) {
      return jsonError(401, {
        code: "unauthenticated",
        message: "Authentication is required.",
      });
    }

    const stream = createDecisionStream({
      question: parsed.data.question,
      runner,
      signal: request.signal,
      userId,
    });

    return createDecisionNdjsonResponse(stream);
  };
}
