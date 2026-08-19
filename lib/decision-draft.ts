const SENTENCE_BOUNDARY = /(?<=[.!?])\s+/;

function sentenceCase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function cleanQuestion(value: string) {
  const cleaned = value
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/[.!]+$/g, "")
    .replace(/\s+/g, " ");
  return cleaned.endsWith("?") ? cleaned : `${cleaned}?`;
}

function titleFromQuestion(question: string) {
  return question.replace(/\?$/, "").slice(0, 96);
}

export function deriveDecisionDraft(input: string) {
  const context = input.trim().replace(/\s+/g, " ");
  const sentences = context.split(SENTENCE_BOUNDARY).filter(Boolean);
  const explicitQuestion = sentences.find((sentence) => sentence.includes("?"));

  if (explicitQuestion) {
    const question = cleanQuestion(explicitQuestion);
    return { context, question, title: titleFromQuestion(question) };
  }

  const vietnameseDecision = context.match(
    /(?:có nên|nên)\s+(.+?)(?:\s+không)?(?:[.!]|$)/i
  );
  if (vietnameseDecision?.[1]) {
    const core = vietnameseDecision[1]
      .replace(/\s+không$/i, "")
      .replace(/^tôi\s+/i, "")
      .trim();
    const question = cleanQuestion(sentenceCase(core));
    return { context, question, title: titleFromQuestion(question) };
  }

  const englishDecision = context.match(
    /(?:should\s+(?:i|we)|whether\s+to)\s+(.+?)(?:[.!]|$)/i
  );
  if (englishDecision?.[1]) {
    const question = cleanQuestion(sentenceCase(englishDecision[1]));
    return { context, question, title: titleFromQuestion(question) };
  }

  const seed = sentences.at(-1) ?? context;
  const words = seed.split(/\s+/).slice(0, 12).join(" ");
  const question = cleanQuestion(`Decide: ${sentenceCase(words)}`);
  return { context, question, title: titleFromQuestion(question) };
}
