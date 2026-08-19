import { NextResponse } from "next/server";
import { checkDatabaseReady } from "@/lib/db/release-queries";
import { assertInternalAuthConfigured } from "@/lib/internal-auth";
import { logAppError } from "@/lib/observability/app-error";

export async function GET() {
  let database = false;
  let auth = false;

  try {
    await checkDatabaseReady();
    database = true;
  } catch {
    logAppError({ code: "DB_HEALTH_FAILED", kind: "database", route: "/api/health" });
  }

  try {
    assertInternalAuthConfigured();
    auth = true;
  } catch {
    logAppError({ code: "AUTH_CONFIG_INVALID", kind: "api", route: "/api/health" });
  }

  const ragflowConfigured = Boolean(
    process.env.RAGFLOW_API_KEY?.trim() && process.env.RAGFLOW_DATASET_IDS?.trim()
  );
  const deepseekConfigured = Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  const ready = database && auth && ragflowConfigured && deepseekConfigured;

  return NextResponse.json(
    {
      checks: {
        auth,
        database,
        deepseekConfigured,
        ragflowConfigured,
      },
      environment: process.env.APP_ENV ?? "development",
      status: ready ? "ok" : "degraded",
      version: process.env.APP_VERSION ?? process.env.GIT_SHA ?? "development",
    },
    { status: ready ? 200 : 503 }
  );
}
