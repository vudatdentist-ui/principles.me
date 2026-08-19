import "server-only";
import { Cortex } from "@/lib/cortex";
import type { JournalCortexAdapter, JournalCortexSuggestion } from "./types";

class LiveJournalCortex implements JournalCortexAdapter {
  async reflect(
    context: Parameters<JournalCortexAdapter["reflect"]>[0],
    userId: string
  ): Promise<JournalCortexSuggestion> {
    const response = await Cortex.run(
      {
        context: [
          context.reflection
            ? `Existing reflection: ${context.reflection}`
            : null,
          "Reflect on this experience. Identify the important recurring pattern or assumption and what should be learned from it. Ask only if missing context would materially change the reflection.",
        ]
          .filter(Boolean)
          .join("\n"),
        input: context.experience,
      },
      userId
    );
    if (response.status === "clarify") {
      return { question: response.clarification.questions[0]?.question };
    }
    return {
      observation: [
        response.result.crux[0]?.text,
        response.result.recommendation.summary.text,
      ]
        .filter(Boolean)
        .join(" "),
    };
  }
}
export const journalCortex: JournalCortexAdapter = new LiveJournalCortex();
