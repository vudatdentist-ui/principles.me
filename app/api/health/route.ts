import { databaseConfigured } from "@/lib/db/config";
import { databaseHealth } from "@/lib/db/health";

function isLocalhostUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return ["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return true;
  }
}

function booleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) {
    return fallback;
  }
  return !["0", "false", "no", "off"].includes(value);
}

export async function GET(): Promise<Response> {
  const dbConfigured = databaseConfigured();
  const dbHealth = dbConfigured
    ? await databaseHealth()
    : { reachable: false, schemaReady: false };
  const deepseekConfigured = Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  const ragflowConfigured = Boolean(process.env.RAGFLOW_API_KEY?.trim());
  const ragflowBootstrapDatasetsConfigured = Boolean(
    process.env.RAGFLOW_DATASET_IDS?.trim()
  );
  const ragflowBaseUrl = (
    process.env.RAGFLOW_BASE_URL ?? "http://localhost:9380"
  ).trim();
  const ragflowEndpointReady =
    process.env.NODE_ENV !== "production" || !isLocalhostUrl(ragflowBaseUrl);
  const liveSearchConfigured = Boolean(process.env.BRAVE_SEARCH_API_KEY?.trim());
  const liveSearchRequired = booleanEnv("LIVE_SEARCH_REQUIRED", false);
  const liveSearchReady = !liveSearchRequired || liveSearchConfigured;
  const ready =
    dbConfigured &&
    dbHealth.reachable &&
    dbHealth.schemaReady &&
    deepseekConfigured &&
    ragflowConfigured &&
    ragflowEndpointReady &&
    liveSearchReady;
  const version = process.env.APP_VERSION?.trim() || "development";

  return Response.json(
    {
      checks: {
        databaseConfigured: dbConfigured,
        databaseReady: dbHealth.reachable,
        databaseSchemaReady: dbHealth.schemaReady,
        deepseekConfigured,
        liveSearchConfigured,
        liveSearchReady,
        ragflowBootstrapDatasetsConfigured,
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
