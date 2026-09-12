#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const canonicalOrigin = (
  process.env.CANONICAL_ORIGIN || "https://principles.me"
).replace(/\/$/, "");
const wwwOrigin =
  process.env.WWW_ORIGIN || canonicalOrigin.replace("://", "://www.");
const timeoutMs = Number(process.env.ROUTING_TIMEOUT_MS || 20_000);
const curlCommand = process.platform === "win32" ? "curl.exe" : "curl";
const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
const captureMarker = "$" + "{1}";
const forbiddenPlaceholders = [
  captureMarker,
  "$$" + "{1}",
  "%7B1%7D",
  "%24" + "%7B1%7D",
];

function isRedirect(status) {
  return status >= 300 && status < 400;
}

function assertSafeLocation(location, requestUrl) {
  assert.ok(location, `Missing Location header for ${requestUrl}.`);
  for (const placeholder of forbiddenPlaceholders) {
    assert.ok(
      !location.includes(placeholder),
      `Location for ${requestUrl} contains the replacement placeholder ${placeholder}: ${location}`,
    );
  }
  return location;
}

function request(url) {
  const output = execFileSync(
    curlCommand,
    [
      "-4",
      "--silent",
      "--show-error",
      "--max-time",
      String(Math.ceil(timeoutMs / 1_000)),
      "--output",
      nullDevice,
      "--dump-header",
      "-",
      "--write-out",
      "\n%{http_code}",
      url,
    ],
    { encoding: "utf8" },
  );
  const statusSeparator = output.lastIndexOf("\n");
  assert.ok(statusSeparator > 0, `curl did not return a status for ${url}.`);
  const status = Number(output.slice(statusSeparator + 1).trim());
  const headers = output.slice(0, statusSeparator);
  const location = headers
    .split(/\r?\n/)
    .find((header) => /^location:/i.test(header))
    ?.replace(/^location:\s*/i, "")
    .trim();
  assert.ok(Number.isInteger(status), `Invalid HTTP status for ${url}.`);
  return { headers, location: location || null, status };
}

async function assertRedirect(url, expectedLocation) {
  const response = await request(url);
  assert.ok(
    isRedirect(response.status),
    `${url} returned HTTP ${response.status}; expected a redirect.`,
  );
  const location = assertSafeLocation(response.location, url);
  assert.equal(location, expectedLocation, `${url} redirected incorrectly.`);
  console.log(`CANONICAL_REDIRECT_OK ${url} -> ${location}`);
}

async function assertEventuallyCanonical(url, expectedLocation) {
  let currentUrl = url;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await request(currentUrl);
    if (!isRedirect(response.status)) {
      assert.equal(
        currentUrl,
        expectedLocation,
        `${url} did not reach the apex.`,
      );
      console.log(`CANONICAL_CHAIN_OK ${url} -> ${currentUrl}`);
      return;
    }

    const location = assertSafeLocation(response.location, currentUrl);
    currentUrl = new URL(location, currentUrl).toString();
  }
  throw new Error(`${url} exceeded the canonical redirect limit.`);
}

await assertRedirect(`${wwwOrigin}/test-path`, `${canonicalOrigin}/test-path`);
await assertRedirect(`${wwwOrigin}/`, `${canonicalOrigin}/`);
await assertRedirect(
  `http://principles.me/test-path`,
  `${canonicalOrigin}/test-path`,
);
await assertEventuallyCanonical(
  `http://www.principles.me/test-path`,
  `${canonicalOrigin}/test-path`,
);

const canonicalRoot = await request(`${canonicalOrigin}/`);
assert.ok(
  !isRedirect(canonicalRoot.status),
  `${canonicalOrigin}/ unexpectedly redirects with HTTP ${canonicalRoot.status}.`,
);
const canonicalRootLocation = canonicalRoot.location;
if (canonicalRootLocation) {
  assertSafeLocation(canonicalRootLocation, `${canonicalOrigin}/`);
  assert.ok(
    !canonicalRootLocation.includes("www.principles.me"),
    `${canonicalOrigin}/ redirects back to www: ${canonicalRootLocation}`,
  );
}
console.log(
  `CANONICAL_APEX_OK ${canonicalOrigin}/ HTTP ${canonicalRoot.status}`,
);
