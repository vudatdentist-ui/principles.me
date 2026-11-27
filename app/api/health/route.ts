import { sharedLibrary } from "@/features/evidence/providers/anythingllm-library";
import { databaseConfigured } from "@/lib/db/config";
import { databaseHealth } from "@/lib/db/health";
import { logEvent } from "@/lib/observability/logger";

function booleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) {
    return fallback;
  }
  return !["0", "false", "no", "off"].includes(value);
}

function checkLibrary() {
  try {
    const library = sharedLibrary();
    return {libraryConfigured: Boolean(library), libraryConfigurationValid: true};
  } catch {
    return {libraryConfigured: false, libraryConfigurationValid: false};
  }
}

export async function GET(): Promise<Response> {
  const dbConfigured = databaseConfigured();
  const dbHealth = dbConfigured
    ? await databaseHealth()
    : { reachable: false, schemaReady: false };
  const deepseekConfigured = Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  const litellmConfigured = Boolean(
    process.env.LITELLM_API_KEY?.trim() &&
      process.env.LITELLM_BASE_URL?.trim(),
  );
  const library = checkLibrary();
  const liveSearchConfigured = Boolean(
    process.env.BRAVE_SEARCH_API_KEY?.trim(),
  );
  const liveSearchRequired = booleanEnv("LIVE_SEARCH_REQUIRED", false);
  const liveSearchReady = !liveSearchRequired || liveSearchConfigured;
  const ready =
    dbConfigured &&
    dbHealth.reachable &&
    dbHealth.schemaReady &&
    (deepseekConfigured || litellmConfigured) &&
    library.libraryConfigurationValid &&
    liveSearchReady;
  const version = process.env.APP_VERSION?.trim() || "development";
  const checks = {
    databaseConfigured: dbConfigured,
    databaseReady: dbHealth.reachable,
    databaseSchemaReady: dbHealth.schemaReady,
    deepseekConfigured,
    litellmConfigured,
    liveSearchConfigured,
    liveSearchReady,
    ...library,
  };

  if (!ready) {
    logEvent("warn", "health.degraded", {
      databaseReady: checks.databaseReady,
      databaseSchemaReady: checks.databaseSchemaReady,
      liveSearchReady: checks.liveSearchReady,
      libraryConfigurationValid: checks.libraryConfigurationValid,
      version,
    });
  }

  return Response.json(
    {
      checks,
      status: ready ? "ok" : "degraded",
      version,
    },
    {
      headers: { "cache-control": "no-store" },
      status: ready ? 200 : 503,
    },
  );
}
