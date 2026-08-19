import { NextResponse } from "next/server";
import { checkDatabaseReady } from "@/lib/db/release-queries";
import {
  assertInternalAuthConfigured,
  internalAuthRequired,
} from "@/lib/internal-auth";
import { logAppError } from "@/lib/observability/app-error";

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

export async function GET() {
  let database = false;

  try {
    await checkDatabaseReady();
    database = true;
  } catch {
    logAppError({
      code: "DB_HEALTH_FAILED",
      kind: "database",
      route: "/api/health",
    });
  }

  const environment =
    process.env.APP_ENV?.trim().toLowerCase() || "development";
  const version =
    process.env.APP_VERSION?.trim() ||
    process.env.SOURCE_COMMIT?.trim() ||
    process.env.GIT_SHA?.trim() ||
    "development";
  const releaseEnvironment =
    ["staging", "production"].includes(environment) || SHA_PATTERN.test(version);
  const authRequired = internalAuthRequired();
  let auth = !releaseEnvironment;

  try {
    assertInternalAuthConfigured();
    auth = !releaseEnvironment || authRequired;
  } catch {
    logAppError({
      code: "AUTH_CONFIG_INVALID",
      kind: "api",
      route: "/api/health",
    });
  }

  const ragflowConfigured = Boolean(
    process.env.RAGFLOW_API_KEY?.trim() &&
      process.env.RAGFLOW_DATASET_IDS?.trim()
  );
  const deepseekConfigured = Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  const ready = database && auth && ragflowConfigured && deepseekConfigured;

  return NextResponse.json(
    {
      checks: {
        auth,
        authRequired,
        database,
        deepseekConfigured,
        ragflowConfigured,
      },
      environment,
      status: ready ? "ok" : "degraded",
      version,
    },
    {
      headers: { "Cache-Control": "no-store" },
      status: ready ? 200 : 503,
    }
  );
}
