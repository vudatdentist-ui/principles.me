function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function positiveNumber(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return value;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

type HealthPayload = {
  status?: string;
  version?: string;
};

async function main() {
  const baseUrl = required("RELEASE_BASE_URL").replace(/\/+$/, "");
  const expectedCommit = required("EXPECTED_COMMIT");
  const timeoutMs = positiveNumber("RELEASE_WAIT_SECONDS", 600) * 1000;
  const intervalMs = positiveNumber("RELEASE_POLL_SECONDS", 10) * 1000;
  const deadline = Date.now() + timeoutMs;
  let lastState = "No response received yet.";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        cache: "no-store",
        redirect: "manual",
      });
      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? ((await response.json()) as HealthPayload)
        : null;
      const version = payload?.version ?? "unknown";
      const status = payload?.status ?? "unknown";

      if (response.ok && status === "ok" && version === expectedCommit) {
        console.log(`Release ready: ${baseUrl} is running ${version}.`);
        return;
      }

      lastState = `HTTP ${response.status}; status=${status}; version=${version}`;
    } catch (error) {
      lastState = error instanceof Error ? error.message : "Unknown network error.";
    }

    console.log(`Release not ready yet: ${lastState}`);
    await sleep(intervalMs);
  }

  throw new Error(
    `Timed out waiting for ${baseUrl} to become healthy on ${expectedCommit}. Last state: ${lastState}`
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Release health gate failed.");
  process.exitCode = 1;
});
