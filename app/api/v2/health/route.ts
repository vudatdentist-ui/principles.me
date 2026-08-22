import postgres from "postgres";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SchemaReadiness = {
  database: boolean;
  decisionSchema: boolean;
};

function isLocalhostUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return ["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return true;
  }
}

async function checkSchema(connectionString: string): Promise<SchemaReadiness> {
  const sql = postgres(connectionString, {
    connect_timeout: 5,
    idle_timeout: 5,
    max: 1,
  });

  try {
    const [row] = await sql`
      SELECT
        to_regclass('public."User"') IS NOT NULL AS "userTable",
        to_regclass('public."Decision"') IS NOT NULL AS "decisionTable",
        to_regclass('public."DecisionRun"') IS NOT NULL AS "decisionRunTable"
    `;

    return {
      database: true,
      decisionSchema: Boolean(
        row?.userTable && row?.decisionTable && row?.decisionRunTable
      ),
    };
  } catch {
    return { database: false, decisionSchema: false };
  } finally {
    await sql.end();
  }
}

export async function GET(): Promise<Response> {
  const authConfigured = Boolean(process.env.AUTH_SECRET?.trim());
  const connectionString = process.env.POSTGRES_URL?.trim();
  const databaseConfigured = Boolean(connectionString);
  const deepseekConfigured = Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  const ragflowConfigured = Boolean(
    process.env.RAGFLOW_API_KEY?.trim() &&
      process.env.RAGFLOW_DATASET_IDS?.trim()
  );
  const ragflowBaseUrl = (
    process.env.RAGFLOW_BASE_URL ?? "http://localhost:9380"
  ).trim();
  const ragflowEndpointReady =
    !ragflowConfigured ||
    process.env.NODE_ENV !== "production" ||
    !isLocalhostUrl(ragflowBaseUrl);

  const schema = connectionString
    ? await checkSchema(connectionString)
    : { database: false, decisionSchema: false };

  const ready =
    authConfigured &&
    databaseConfigured &&
    schema.database &&
    schema.decisionSchema &&
    deepseekConfigured &&
    ragflowEndpointReady;
  const version = process.env.APP_VERSION?.trim() || "development";

  return Response.json(
    {
      checks: {
        authConfigured,
        database: schema.database,
        databaseConfigured,
        decisionSchema: schema.decisionSchema,
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
