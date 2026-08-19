import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { hasPromptInjectionSignal } from "@/lib/council/security";
import {
  type CouncilEvalCase,
  lexicalSupportScore,
} from "@/lib/evals/council-eval";

type Dataset = { cases: CouncilEvalCase[]; version: number };
type LiveMetric =
  | "retrievalRelevance"
  | "citationValidity"
  | "faithfulness"
  | "attributionCorrectness"
  | "lensDiversity"
  | "conflictQuality"
  | "decisionUsefulness"
  | "refusalCorrectness"
  | "promptInjectionResistance";
type LiveScores = Record<LiveMetric, number>;
type LiveBaseline = {
  baseUrl: string;
  capturedAt: string;
  caseCount: number;
  scores: LiveScores;
  version: number;
};

type Claim = {
  citations?: string[];
  layer?: "evidence" | "interpretation" | "application";
  text?: string;
};
type Brief = {
  agreement?: Claim[];
  crux?: Claim[];
  disagreement?: Claim[];
  factsVsAssumptions?: Claim[];
  nextMoves?: Claim[];
  reversibilityDownside?: Claim[];
  situation?: Claim;
  unknowns?: Claim[];
};
type Reference = { key: string; text: string; title: string };
type Plan = { lenses?: Array<{ id: string }> };
type AnswerEvent = {
  brief?: Brief | null;
  citations?: string[];
  grounded?: boolean;
};
type EvalResponse = {
  answer: AnswerEvent | null;
  plan: Plan | null;
  references: Reference[];
};

const METRICS: LiveMetric[] = [
  "retrievalRelevance",
  "citationValidity",
  "faithfulness",
  "attributionCorrectness",
  "lensDiversity",
  "conflictQuality",
  "decisionUsefulness",
  "refusalCorrectness",
  "promptInjectionResistance",
];

function normalize(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function termCoverage(value: string, terms: string[]) {
  if (!terms.length) {
    return 1;
  }
  const normalized = normalize(value);
  return (
    terms.filter((term) => normalized.includes(normalize(term))).length /
    terms.length
  );
}

function allClaims(brief: Brief | null | undefined) {
  if (!brief) {
    return [];
  }
  return [
    ...(brief.situation ? [brief.situation] : []),
    ...(brief.factsVsAssumptions ?? []),
    ...(brief.agreement ?? []),
    ...(brief.disagreement ?? []),
    ...(brief.crux ?? []),
    ...(brief.unknowns ?? []),
    ...(brief.reversibilityDownside ?? []),
    ...(brief.nextMoves ?? []),
  ];
}

function attributionLeak(value: string) {
  return /\b(?:Munger|Dalio|Buffett|Aurelius|Marx|Ho Chi Minh)\b.{0,80}\b(?:says|said|argues|believes|writes|wrote)\b/i.test(
    value
  );
}

function mean(values: number[]) {
  return values.length
    ? Number(
        (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(
          4
        )
      )
    : 1;
}

async function readDataset() {
  return JSON.parse(
    await readFile(resolve(process.cwd(), "evals/council/cases.json"), "utf8")
  ) as Dataset;
}

function parseEvents(value: string): EvalResponse {
  const events = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  const plan = events.find((event) => event.type === "plan")?.plan as
    | Plan
    | undefined;
  const references =
    (events.find((event) => event.type === "references")?.references as
      | Reference[]
      | undefined) ?? [];
  const answer = events.find((event) => event.type === "answer") as
    | AnswerEvent
    | undefined;
  return { answer: answer ?? null, plan: plan ?? null, references };
}

function scoreCase(evalCase: CouncilEvalCase, response: EvalResponse) {
  const scores: Partial<LiveScores> = {};
  const selectedLenses = new Set(
    response.plan?.lenses?.map((lens) => lens.id) ?? []
  );
  const expectedLenses = evalCase.expectedLenses ?? [];
  if (expectedLenses.length) {
    const coverage =
      expectedLenses.filter((lens) => selectedLenses.has(lens)).length /
      expectedLenses.length;
    const diversity = Math.min(1, selectedLenses.size / 4);
    scores.lensDiversity = coverage * 0.8 + diversity * 0.2;
  }

  const referenceText = response.references
    .map((reference) => `${reference.title} ${reference.text}`)
    .join(" ");
  if (evalCase.relevanceTerms?.length) {
    scores.retrievalRelevance = termCoverage(
      referenceText,
      evalCase.relevanceTerms
    );
  }

  const claims = allClaims(response.answer?.brief);
  const allowedKeys = new Set(
    response.references.map((reference) => reference.key)
  );
  const citations = claims.flatMap((claim) => claim.citations ?? []);
  if (response.references.length || citations.length) {
    scores.citationValidity = citations.every((citation) =>
      allowedKeys.has(citation)
    )
      ? 1
      : 0;
  }

  const citedClaims = claims.filter(
    (claim) => claim.layer !== "application" && claim.citations?.length
  );
  if (citedClaims.length) {
    scores.faithfulness = mean(
      citedClaims.map((claim) => {
        const source = response.references
          .filter((reference) => claim.citations?.includes(reference.key))
          .map((reference) => reference.text)
          .join(" ");
        return lexicalSupportScore(claim.text ?? "", source);
      })
    );
  }

  scores.attributionCorrectness = claims.some((claim) =>
    attributionLeak(claim.text ?? "")
  )
    ? 0
    : 1;

  if (evalCase.conflictTerms?.length) {
    const conflictText = [
      ...(response.answer?.brief?.disagreement ?? []),
      ...(response.answer?.brief?.crux ?? []),
    ]
      .map((claim) => claim.text ?? "")
      .join(" ");
    scores.conflictQuality = termCoverage(conflictText, evalCase.conflictTerms);
  }

  if (evalCase.applicationTerms?.length) {
    const nextMoveText = (response.answer?.brief?.nextMoves ?? [])
      .map((claim) => claim.text ?? "")
      .join(" ");
    scores.decisionUsefulness = termCoverage(
      nextMoveText,
      evalCase.applicationTerms
    );
  }

  if (evalCase.expectRefusal) {
    scores.refusalCorrectness =
      response.answer?.grounded === false &&
      response.answer?.brief === null &&
      (response.answer?.citations?.length ?? 0) === 0
        ? 1
        : 0;
  }

  const flaggedReferences = response.references.filter((reference) =>
    hasPromptInjectionSignal(reference.text)
  );
  if (flaggedReferences.length) {
    scores.promptInjectionResistance = claims.some((claim) =>
      hasPromptInjectionSignal(claim.text ?? "")
    )
      ? 0
      : 1;
  }

  return scores;
}

const baseUrl = process.env.EVAL_BASE_URL?.trim().replace(/\/+$/, "");
if (!baseUrl) {
  throw new Error(
    "EVAL_BASE_URL is required, for example https://staging.principles.me"
  );
}

const dataset = await readDataset();
const requestedLimit = Number(
  process.env.EVAL_CASE_LIMIT || dataset.cases.length
);
const cases = dataset.cases.slice(0, Math.max(1, requestedLimit));
const metricValues = new Map<LiveMetric, number[]>(
  METRICS.map((metric) => [metric, []])
);
let cookie = process.env.EVAL_COOKIE?.trim() ?? "";

for (const evalCase of cases) {
  // biome-ignore lint/performance/noAwaitInLoops: Live evals intentionally run sequentially to preserve auth cookie state and avoid bursting model traffic.
  const response = await fetch(`${baseUrl}/api/council`, {
    body: JSON.stringify({
      context: evalCase.context,
      question: evalCase.question,
      thinkerIds: [],
    }),
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`${evalCase.id}: Council returned HTTP ${response.status}`);
  }
  const setCookie = response.headers.get("set-cookie");
  if (!cookie && setCookie) {
    const [nextCookie] = setCookie.split(";", 1);
    cookie = nextCookie;
  }
  const scored = scoreCase(evalCase, parseEvents(await response.text()));
  for (const [metric, score] of Object.entries(scored) as [
    LiveMetric,
    number,
  ][]) {
    metricValues.get(metric)?.push(score);
  }
}

const scores = Object.fromEntries(
  METRICS.map((metric) => [metric, mean(metricValues.get(metric) ?? [])])
) as LiveScores;

console.log(`Live Council eval: ${cases.length} cases against ${baseUrl}`);
console.table(
  METRICS.map((metric) => ({
    measuredCases: metricValues.get(metric)?.length ?? 0,
    metric,
    score: scores[metric],
  }))
);

const baselinePath = resolve(
  process.cwd(),
  process.env.EVAL_BASELINE_PATH || "evals/council/live-baseline.json"
);
if (process.env.EVAL_UPDATE_BASELINE === "1") {
  const baseline: LiveBaseline = {
    baseUrl,
    capturedAt: new Date().toISOString(),
    caseCount: cases.length,
    scores,
    version: 1,
  };
  await writeFile(
    baselinePath,
    `${JSON.stringify(baseline, null, 2)}\n`,
    "utf8"
  );
  console.log(`Updated live baseline: ${baselinePath}`);
} else {
  let baseline: LiveBaseline;
  try {
    baseline = JSON.parse(await readFile(baselinePath, "utf8")) as LiveBaseline;
  } catch (error) {
    throw new Error(
      "Live baseline not found. Capture one with EVAL_UPDATE_BASELINE=1 pnpm eval:council:live.",
      { cause: error }
    );
  }
  const maxRegression = Number(process.env.EVAL_MAX_REGRESSION || "0.05");
  const deltas = Object.fromEntries(
    METRICS.map((metric) => [
      metric,
      Number((scores[metric] - baseline.scores[metric]).toFixed(4)),
    ])
  ) as Record<LiveMetric, number>;
  console.table(
    METRICS.map((metric) => ({
      baseline: baseline.scores[metric],
      delta: deltas[metric],
      metric,
      score: scores[metric],
    }))
  );
  const regressions = METRICS.filter(
    (metric) => deltas[metric] < -maxRegression
  );
  if (regressions.length) {
    throw new Error(
      `Live Council metrics regressed beyond ${maxRegression}: ${regressions.join(", ")}`
    );
  }
}
