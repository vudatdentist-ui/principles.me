import "server-only";

import type {
  JournalCortexAdapter,
  JournalCortexContext,
  JournalCortexSuggestion,
} from "./types";

class JournalCortexFallback implements JournalCortexAdapter {
  reflect(context: JournalCortexContext): Promise<JournalCortexSuggestion> {
    const hasReflection = Boolean(context.reflection?.trim());
    return Promise.resolve({
      question: hasReflection
        ? "What would you do differently when this happens again?"
        : "What part of this experience was under your control?",
    });
  }
}

/**
 * Journal depends only on this adapter. Cortex Core can replace the fallback
 * without changing Journal persistence, APIs, or UI.
 */
export const journalCortex: JournalCortexAdapter = new JournalCortexFallback();
