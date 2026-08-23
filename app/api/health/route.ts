function isLocalhostUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return ["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return true;
  }
}

export async function GET(): Promise<Response> {
  const deepseekConfigured = Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  const ragflowConfigured = Boolean(
    process.env.RAGFLOW_API_KEY?.trim() &&
      process.env.RAGFLOW_DATASET_IDS?.trim()
  );
  const ragflowBaseUrl = (
    process.env.RAGFLOW_BASE_URL ?? "http://localhost:9380"
  ).trim();
  const ragflowEndpointReady =
    process.env.NODE_ENV !== "production" || !isLocalhostUrl(ragflowBaseUrl);
  const ready = deepseekConfigured && ragflowConfigured && ragflowEndpointReady;
  const version = process.env.APP_VERSION?.trim() || "development";

  return Response.json(
    {
      checks: {
        deepseekConfigured,
        ragflowConfigured,
        ragflowEndpointReady,
      },
      status: ready ? "ok" : "degraded",
      version,
    },
    {
      headers: { "cache-control": "no-store" },
      status: ready ? 200 : 503,
    }
  );
}
