import assert from "node:assert/strict";
import test from "node:test";
import { libraryConfig, SharedLibrary } from "../anythingllm-library";
import { projectEvidenceForClient } from "../../client-reference";

const config = {
  key: "fixture",
  slug: "shared-books",
  endpoint: "https://books.example/api/v1/workspace/shared-books",
};
test("book search stays inside the configured workspace and returns attributed text", async () => {
  const provider = new SharedLibrary(config, async (url, options) => {
    assert.equal(url, config.endpoint + "/vector-search");
    assert.equal(options?.redirect, "error");
    assert.deepEqual(JSON.parse(String(options?.body)), {
      query: "kỷ luật",
      topN: 8,
    });
    return Response.json({
      results: [
        {
          text: "Keep a record of decisions.",
          metadata: {
            title: "Decision Journal",
            url: "file:///private/book.pdf",
          },
        },
        { text: "missing title", metadata: { title: "" } },
      ],
    });
  });
  const hits = await provider.search("kỷ luật");
  assert.equal(hits.length, 1);
  const ref = projectEvidenceForClient(hits[0]);
  assert.equal(ref.title, "Decision Journal");
  assert.equal(ref.snippet, "Keep a record of decisions.");
  assert.equal(ref.url, null);
});
test("provider failures and unexpected catalog scopes do not produce citations", async () => {
  assert.throws(() => libraryConfig({ ANYTHINGLLM_API_KEY: "fixture" }));
  const offline = new SharedLibrary(
    config,
    async () => new Response("", { status: 503 }),
  );
  await assert.rejects(offline.search("risk"));
  const wrong = new SharedLibrary(config, async () =>
    Response.json({ workspace: [{ slug: "private", documents: [] }] }),
  );
  await assert.rejects(wrong.books());
});
