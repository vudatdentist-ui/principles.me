import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  type CouncilEvalCase,
  type CouncilEvalMetric,
  evaluateFixtureDataset,
} from "@/lib/evals/council-eval";

type Dataset = { cases: CouncilEvalCase[]; version: number };
type Baseline = {
  caseCount: number;
  capturedAt: string;
  maxRegression: number;
  scores: Record<CouncilEvalMetric, number>;
  version: number;
};

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(resolve(process.cwd(), path), "utf8")) as T;
}

const dataset = await readJson<Dataset>("evals/council/cases.json");
const baseline = await readJson<Baseline>("evals/council/baseline.json");

if (dataset.cases.length !== baseline.caseCount) {
  throw new Error(
    `Council eval dataset has ${dataset.cases.length} cases; baseline expects ${baseline.caseCount}.`
  );
}

const evaluation = evaluateFixtureDataset(dataset.cases);
const metrics = Object.keys(evaluation.scores) as CouncilEvalMetric[];
const deltas = Object.fromEntries(
  metrics.map((metric) => [
    metric,
    Number((evaluation.scores[metric] - baseline.scores[metric]).toFixed(4)),
  ])
) as Record<CouncilEvalMetric, number>;

console.log(`Council trust eval: ${dataset.cases.length} cases`);
console.table(
  metrics.map((metric) => ({
    baseline: baseline.scores[metric],
    delta: deltas[metric],
    metric,
    score: evaluation.scores[metric],
  }))
);

const regressed = metrics.filter(
  (metric) =>
    evaluation.scores[metric] <
    baseline.scores[metric] - baseline.maxRegression
);

if (evaluation.failedCaseIds.length) {
  console.error(
    `Eval cases below minimum quality: ${evaluation.failedCaseIds.join(", ")}`
  );
}
if (regressed.length) {
  console.error(
    `Metrics regressed beyond ${baseline.maxRegression}: ${regressed.join(", ")}`
  );
}

if (evaluation.failedCaseIds.length || regressed.length) {
  process.exitCode = 1;
} else {
  console.log(
    `Council trust eval passed against baseline captured ${baseline.capturedAt}.`
  );
}
