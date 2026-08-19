import type { CortexResponse } from "./types";

export type AskSource = { id: string; title: string; detail?: string };
export type AskQuestion = { id: string; prompt: string; options?: string[] };
export type AskComplete = { type: "complete"; runId: string; result: { framing?: string; crux?: string; evidence?: string[]; conflicts?: string[]; read?: string; confidence?: "low" | "medium" | "high"; wouldChange?: string; sources?: AskSource[] } };
export type AskClarify = { type: "clarify"; runId: string; questions: AskQuestion[]; canContinue: true };
export type AskResponse = AskComplete | AskClarify;

function normalize(data: CortexResponse): AskResponse {
  if (data.status === "clarify") {
    return { type: "clarify", runId: data.runId, canContinue: true, questions: data.clarification.questions.map((q) => ({ id: q.id, prompt: q.question })) };
  }
  const result = data.result;
  return {
    type: "complete",
    runId: data.runId,
    result: {
      framing: result.framing.text,
      crux: result.crux.map((item) => item.text).join("\n"),
      evidence: result.evidence.map((item) => item.kind === "custom_principle" ? item.statement : item.excerpt),
      conflicts: result.conflicts.map((item) => item.text),
      read: [result.recommendation.summary.text, ...result.recommendation.actions.map((item) => item.text)].filter(Boolean).join("\n"),
      confidence: result.confidence.level,
      wouldChange: result.changeConditions.map((item) => item.text).join("\n"),
      sources: result.evidence.map((item) => ({ id: item.key, title: item.kind === "custom_principle" ? "Your principle" : item.title, detail: item.kind === "custom_principle" ? item.statement : item.excerpt })),
    },
  };
}

async function json<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new Error((data as { error?: string }).error ?? "Ask failed.");
  return data as T;
}

export const cortexAskClient = {
  async run(input: string): Promise<AskResponse> {
    const response = await fetch("/api/cortex", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input }) });
    return normalize(await json<CortexResponse>(response));
  },
  async continue(runId: string, answers: Record<string, string>): Promise<AskResponse> {
    const response = await fetch(`/api/cortex/${runId}/continue`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers }) });
    return normalize(await json<CortexResponse>(response));
  },
};
