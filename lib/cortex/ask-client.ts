import type { CortexResponse } from "./types";

export type AskSource = { id: string; title: string; detail?: string };
export type AskQuestion = { id: string; prompt: string; options?: string[] };
export type AskComplete = {
  type: "complete";
  runId: string;
  result: {
    framing?: string;
    crux?: string;
    evidence?: string[];
    conflicts?: string[];
    read?: string;
    confidence?: "low" | "medium" | "high";
    wouldChange?: string;
    sources?: AskSource[];
  };
};
export type AskClarify = {
  type: "clarify";
  runId: string;
  questions: AskQuestion[];
  canContinue: true;
};
export type AskResponse = AskComplete | AskClarify;

function normalize(data: CortexResponse): AskResponse {
  if (data.status === "clarify") {
    return {
      canContinue: true,
      questions: data.clarification.questions.map((q) => ({
        id: q.id,
        prompt: q.question,
      })),
      runId: data.runId,
      type: "clarify",
    };
  }
  const { result } = data;
  return {
    result: {
      confidence: result.confidence.level,
      conflicts: result.conflicts.map((item) => item.text),
      crux: result.crux.map((item) => item.text).join("\n"),
      evidence: result.evidence.map((item) =>
        item.kind === "custom_principle" ? item.statement : item.excerpt
      ),
      framing: result.framing.text,
      read: [
        result.recommendation.summary.text,
        ...result.recommendation.actions.map((item) => item.text),
      ]
        .filter(Boolean)
        .join("\n"),
      sources: result.evidence.map((item) => ({
        detail:
          item.kind === "custom_principle" ? item.statement : item.excerpt,
        id: item.key,
        title: item.kind === "custom_principle" ? "Your principle" : item.title,
      })),
      wouldChange: result.changeConditions.map((item) => item.text).join("\n"),
    },
    runId: data.runId,
    type: "complete",
  };
}

async function json<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? "Ask failed.");
  }
  return data as T;
}

export const cortexAskClient = {
  async continue(
    runId: string,
    answers: Record<string, string>
  ): Promise<AskResponse> {
    const response = await fetch(`/api/cortex/${runId}/continue`, {
      body: JSON.stringify({ answers }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    return normalize(await json<CortexResponse>(response));
  },
  async run(input: string): Promise<AskResponse> {
    const response = await fetch("/api/cortex", {
      body: JSON.stringify({ input }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    return normalize(await json<CortexResponse>(response));
  },
};
