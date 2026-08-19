const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "can",
  "co",
  "có",
  "của",
  "do",
  "đang",
  "được",
  "for",
  "from",
  "hay",
  "i",
  "in",
  "is",
  "it",
  "là",
  "một",
  "my",
  "nên",
  "of",
  "on",
  "or",
  "should",
  "the",
  "this",
  "to",
  "tôi",
  "và",
  "we",
  "with",
  "you",
]);

function normalize(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

export function meaningfulTokens(value: string) {
  const normalized = normalize(value);
  if (!normalized) {
    return new Set<string>();
  }
  return new Set(
    normalized
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
  );
}

export function relevanceScore(query: string, candidate: string) {
  const queryTokens = meaningfulTokens(query);
  const candidateTokens = meaningfulTokens(candidate);
  if (!queryTokens.size || !candidateTokens.size) {
    return 0;
  }

  let intersection = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) {
      intersection += 1;
    }
  }
  if (!intersection) {
    return 0;
  }

  const union = new Set([...queryTokens, ...candidateTokens]).size;
  const jaccard = intersection / union;
  const queryCoverage = intersection / queryTokens.size;
  const candidateCoverage = intersection / candidateTokens.size;
  return Number(
    Math.min(
      1,
      jaccard * 0.45 + queryCoverage * 0.35 + candidateCoverage * 0.2
    ).toFixed(4)
  );
}

const NEGATIVE_DIRECTIVES = [
  "avoid",
  "do not",
  "dont",
  "never",
  "khong",
  "tranh",
];
const CONTRARY_MARKERS = [
  "ignore",
  "without",
  "skip",
  "immediately",
  "anyway",
  "bo qua",
  "khong can",
  "ngay lap tuc",
];

export function possibleContradiction({
  principle,
  judgment,
}: {
  principle: string;
  judgment: string;
}) {
  const normalizedPrinciple = normalize(principle);
  const normalizedJudgment = normalize(judgment);
  const shared = relevanceScore(principle, judgment);
  if (shared < 0.08) {
    return false;
  }

  const hasNegativeDirective = NEGATIVE_DIRECTIVES.some((marker) =>
    normalizedPrinciple.includes(normalize(marker))
  );
  const hasContraryMarker = CONTRARY_MARKERS.some((marker) =>
    normalizedJudgment.includes(normalize(marker))
  );

  return hasNegativeDirective && hasContraryMarker;
}
