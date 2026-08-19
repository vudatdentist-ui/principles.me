import { OpenTelemetry } from "@ai-sdk/otel";
import { registerOTel } from "@vercel/otel";
import { registerTelemetry } from "ai";
import { logAppError } from "@/lib/observability/app-error";

export function register() {
  registerOTel({ serviceName: "chatbot" });
  registerTelemetry(new OpenTelemetry());
}

export function onRequestError(
  error: unknown,
  request: { method?: string; path?: string },
  context: { routePath?: string; routeType?: string }
) {
  logAppError({
    code: error instanceof Error ? error.name : "UNKNOWN_SERVER_ERROR",
    kind: "api",
    route: context.routePath ?? request.path ?? "unknown",
    stage: context.routeType ?? request.method ?? "request",
    status: 500,
  });
}
