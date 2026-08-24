export function databaseUrl(
  env: Readonly<Record<string, string | undefined>> = process.env
): string {
  const configured = env.DATABASE_URL?.trim();
  if (configured) {
    return configured;
  }

  const password = env.POSTGRES_PASSWORD?.trim();
  if (!password) {
    throw new Error("Database configuration is missing.");
  }

  const user = env.POSTGRES_USER?.trim() || "principles";
  const host = env.POSTGRES_HOST?.trim() || "127.0.0.1";
  const port = env.POSTGRES_PORT?.trim() || "5432";
  const database = env.POSTGRES_DB?.trim() || "principles";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

export function databaseConfigured(
  env: Readonly<Record<string, string | undefined>> = process.env
): boolean {
  return Boolean(env.DATABASE_URL?.trim() || env.POSTGRES_PASSWORD?.trim());
}
