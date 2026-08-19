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

type WaitOptions = {
  baseUrl: string;
  deadline: number;
  expectedCommit: string;
  intervalMs: number;
  lastState?: string;
};

async function waitUntilReady({
  baseUrl,
  deadline,
  expectedCommit,
  intervalMs,
  lastState = "No response received yet.",
}: WaitOptions): Promise<void> {
  if (Date.now() >= deadline) {
    throw new Error(
      `Timed out waiting for ${baseUrl} to become healthy on ${expectedCommit}. Last state: ${lastState}`
    );
  }

  let nextState = lastState;
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

    nextState = `HTTP ${response.status}; status=${status}; version=${version}`;
  } catch (error) {
    nextState =
      error instanceof Error ? error.message : "Unknown network error.";
  }

  console.log(`Release not ready yet: ${nextState}`);
  await sleep(intervalMs);
  await waitUntilReady({
    baseUrl,
    deadline,
    expectedCommit,
    intervalMs,
    lastState: nextState,
  });
}

async function main() {
  const baseUrl = required("RELEASE_BASE_URL").replace(/\/+$/, "");
  const expectedCommit = required("EXPECTED_COMMIT");
  const timeoutMs = positiveNumber("RELEASE_WAIT_SECONDS", 600) * 1000;
  const intervalMs = positiveNumber("RELEASE_POLL_SECONDS", 10) * 1000;

  await waitUntilReady({
    baseUrl,
    deadline: Date.now() + timeoutMs,
    expectedCommit,
    intervalMs,
  });
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Release health gate failed."
  );
  process.exitCode = 1;
});
