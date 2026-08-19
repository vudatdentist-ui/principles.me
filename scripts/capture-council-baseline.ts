import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  type CouncilEvalCase,
  evaluateFixtureDataset,
} from "@/lib/evals/council-eval";

type Dataset = { cases: CouncilEvalCase[]; version: number };

const datasetPath = resolve(process.cwd(), "evals/council/cases.json");
const baselinePath = resolve(process.cwd(), "evals/council/baseline.json");
const dataset = JSON.parse(await readFile(datasetPath, "utf8")) as Dataset;
const evaluation = evaluateFixtureDataset(dataset.cases);

if (dataset.cases.length !== 50) {
  throw new Error(
    `Expected 50 Council eval cases, found ${dataset.cases.length}.`
  );
}
if (evaluation.failedCaseIds.length) {
  throw new Error(
    `Cannot capture a failing baseline. Failing cases: ${evaluation.failedCaseIds.join(", ")}`
  );
}

const baseline = {
  capturedAt: new Date().toISOString(),
  caseCount: dataset.cases.length,
  maxRegression: 0.02,
  scores: evaluation.scores,
  version: 1,
};

await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
console.log(JSON.stringify(baseline, null, 2));
