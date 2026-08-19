export type CouncilTelemetry = {
  citationCount: number;
  decisionId: string | null;
  errorCode: string | null;
  errorStage: string | null;
  event: "council_run";
  grounded: boolean;
  model: string;
  modelLatencyMs: number;
  promptInjectionFlagCount: number;
  retrievalLatencyMs: number;
  retrievalQueryCount: number;
  retrievalScoreAvg: number | null;
  retrievalScoreMax: number | null;
  retrievalScoreMin: number | null;
  retrievedChunks: number;
  successfulRetrievalQueryCount: number;
  timestamp: string;
};

export function summarizeRetrievalScores(scores: Array<number | null>) {
  const numeric = scores.filter(
    (value): value is number => value !== null && Number.isFinite(value)
  );
  if (!numeric.length) {
    return { avg: null, max: null, min: null };
  }
  const total = numeric.reduce((sum, value) => sum + value, 0);
  return {
    avg: Number((total / numeric.length).toFixed(4)),
    max: Math.max(...numeric),
    min: Math.min(...numeric),
  };
}

export function buildCouncilTelemetry(
  input: Omit<CouncilTelemetry, "event" | "timestamp">
): CouncilTelemetry {
  return {
    ...input,
    event: "council_run",
    timestamp: new Date().toISOString(),
  };
}

export function logCouncilTelemetry(telemetry: CouncilTelemetry) {
  console.info(JSON.stringify(telemetry));
}
