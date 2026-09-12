#!/usr/bin/env node

import assert from "node:assert/strict";

const canonicalOrigin = (
  process.env.CANONICAL_ORIGIN || "https://principles.me"
).replace(/\/$/, "");
const wwwOrigin =
  process.env.WWW_ORIGIN || canonicalOrigin.replace("://", "://www.");
const timeoutMs = Number(process.env.ROUTING_TIMEOUT_MS || 20_000);
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

async function request(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function assertRedirect(url, expectedLocation) {
  const response = await request(url);
  assert.ok(
    isRedirect(response.status),
    `${url} returned HTTP ${response.status}; expected a redirect.`,
  );
  const location = assertSafeLocation(response.headers.get("location"), url);
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

    const location = assertSafeLocation(
      response.headers.get("location"),
      currentUrl,
    );
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
const canonicalRootLocation = canonicalRoot.headers.get("location");
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
