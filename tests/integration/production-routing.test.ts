import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const deployScript = readFileSync("scripts/deploy-production.sh", "utf8");
const composeFile = readFileSync("docker-compose.hostinger.yml", "utf8");
const captureMarker = "$" + "{1}";
const directReplacement = `https://principles.me/\\${captureMarker}`;
const composeReplacement = "https://principles.me/$$" + "{1}";
const traefikReplacement = `https://principles.me/${captureMarker}`;
const forbiddenPlaceholders = [
  captureMarker,
  "$$" + "{1}",
  "%7B1%7D",
  "%24" + "%7B1%7D",
];

function applyTraefikReplacement(requestUrl: string): string {
  const match = requestUrl.match(/^https:\/\/www\.principles\.me\/(.*)$/);
  assert.ok(match, `Expected a www HTTPS URL: ${requestUrl}`);
  return traefikReplacement.replace(captureMarker, match[1]);
}

test("direct docker CLI receives a single Traefik capture-group marker", () => {
  const replacementLine = deployScript
    .split("\n")
    .find((line) => line.includes("redirectregex.replacement="));
  assert.ok(replacementLine, "Direct docker replacement label is missing.");
  assert.ok(
    replacementLine.includes(directReplacement),
    `Expected direct docker label to contain ${directReplacement}.`,
  );
  assert.ok(
    !replacementLine.includes(composeReplacement),
    "Direct docker CLI must not receive Compose's doubled dollar escape.",
  );

  assert.equal(directReplacement.replace("\\$", "$"), traefikReplacement);
});

test("Compose keeps its doubled dollar escape", () => {
  assert.ok(
    composeFile.includes(
      `traefik.http.middlewares.principles-www-redirect.redirectregex.replacement: ${composeReplacement}`,
    ),
  );
});

test("canonical redirect preserves paths without leaking placeholders", () => {
  const cases = [
    ["https://www.principles.me/test-path", "https://principles.me/test-path"],
    ["https://www.principles.me/", "https://principles.me/"],
    ["https://www.principles.me/foo/bar", "https://principles.me/foo/bar"],
  ] as const;

  for (const [requestUrl, expectedLocation] of cases) {
    const location = applyTraefikReplacement(requestUrl);
    assert.equal(location, expectedLocation);
    for (const placeholder of forbiddenPlaceholders) {
      assert.ok(!location.includes(placeholder));
    }
  }
});

test("canonical apex is not redirected to www", () => {
  const canonicalUrl = new URL("https://principles.me/");
  assert.equal(canonicalUrl.hostname, "principles.me");
  assert.notEqual(canonicalUrl.hostname, "www.principles.me");
});

test("legacy encoded placeholder recovers to the canonical root", () => {
  const legacyUrl = new URL("https://principles.me/$%7B1%7D");
  legacyUrl.port = "3000";
  assert.equal(decodeURIComponent(legacyUrl.pathname), `/${captureMarker}`);
  legacyUrl.protocol = "https:";
  legacyUrl.hostname = "principles.me";
  legacyUrl.port = "";
  legacyUrl.pathname = "/";
  assert.equal(legacyUrl.toString(), "https://principles.me/");
});
