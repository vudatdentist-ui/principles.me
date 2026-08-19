export type AskSource = {
  id: string;
  title: string;
  detail?: string;
};

export type AskQuestion = {
  id: string;
  prompt: string;
  options?: string[];
};

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

const runInputs = new Map<string, string>();

async function request(payload: Record<string, unknown>): Promise<AskResponse> {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as AskResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Ask failed.");
  }
  return data;
}

export const cortexAskClient = {
  async run(input: string): Promise<AskResponse> {
    const result = await request({ mode: "run", input });
    runInputs.set(result.runId, input);
    return result;
  },

  async continue(
    runId: string,
    answers: Record<string, string>
  ): Promise<AskResponse> {
    const input = runInputs.get(runId);
    if (!input) {
      throw new Error("This thinking session is no longer available.");
    }
    const result = await request({ mode: "continue", runId, input, answers });
    return result;
  },
};
