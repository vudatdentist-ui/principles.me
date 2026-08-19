export type AppErrorEvent = {
  code: string;
  kind: "api" | "client" | "database" | "migration" | "provider";
  route?: string;
  stage?: string;
  status?: number;
};

export function logAppError(event: AppErrorEvent) {
  console.error(
    JSON.stringify({
      code: event.code,
      event: "app_error",
      kind: event.kind,
      route: event.route ?? null,
      stage: event.stage ?? null,
      status: event.status ?? null,
      timestamp: new Date().toISOString(),
    })
  );
}
