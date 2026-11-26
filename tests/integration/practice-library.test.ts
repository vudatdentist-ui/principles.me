import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { GET as catalog, POST as search } from "../../app/api/library/route";
import {
  GET as readPractice,
  POST as writePractice,
} from "../../app/api/practice/route";
import { createAccount, createSession } from "../../features/auth/repository";
import { hashPassword } from "../../features/auth/password";
import { closeDatabaseForTests } from "../../lib/db/client";

test("a shared book passage can start a private case without sharing it with another reader", async () => {
  const requests: string[] = [];
  const book = { title: "Fixture Book" };
  const text = "Record the assumption before the decision.";
  const service = createServer((request, response) => {
    requests.push(request.method + " " + request.url);
    if (request.headers.authorization !== "Bearer fixture-library") {
      response.writeHead(401).end();
      return;
    }
    response.setHeader("Content-Type", "application/json");
    response.end(
      JSON.stringify(
        request.method === "GET"
          ? {
              workspace: [
                {
                  slug: "books",
                  documents: [{ metadata: JSON.stringify(book) }],
                },
              ],
            }
          : { results: [{ text, metadata: book }] },
      ),
    );
  });
  await new Promise<void>((resolve) => service.listen(0, "127.0.0.1", resolve));
  try {
    const origin = "http://127.0.0.1:3000";
    process.env.AUTH_SIGNUP_MODE = "open";
    process.env.ANYTHINGLLM_BASE_URL =
      "http://127.0.0.1:" + (service.address() as AddressInfo).port;
    process.env.ANYTHINGLLM_LIBRARY_WORKSPACE = "books";
    process.env.ANYTHINGLLM_API_KEY = "fixture-library";
    const passwordHash = await hashPassword("private case fixture password");
    async function account() {
      const user = await createAccount({
        email: randomUUID() + "@example.test",
        passwordHash,
      });
      return "principles_session=" + (await createSession(user.userId));
    }
    const [owner, peer] = await Promise.all([account(), account()]);
    function req(path: string, cookie: string, body?: unknown) {
      return new Request(origin + path, {
        headers: { cookie, origin, "content-type": "application/json" },
        method: body ? "POST" : "GET",
        body: body ? JSON.stringify(body) : undefined,
      });
    }
    assert.equal((await catalog(req("/api/library", ""))).status, 401);
    assert.deepEqual(await (await catalog(req("/api/library", peer))).json(), {
      books: [book.title],
    });
    const hit = await search(req("/api/library", owner, { query: "decision" }));
    assert.equal(hit.status, 200);
    const { references } = await hit.json();
    assert.equal(references[0].snippet, text);
    assert.equal(references[0].title, book.title);
    assert.deepEqual(requests, [
      "GET /api/v1/workspace/books",
      "POST /api/v1/workspace/books/vector-search",
    ]);
    const id = randomUUID();
    const note = await writePractice(
      req("/api/practice", owner, { kind: "note", id, situation: text }),
    );
    assert.equal(note.status, 200);
    assert.equal(
      (await readPractice(req("/api/practice?case=" + id, peer))).status,
      404,
    );
    assert.equal(
      (await readPractice(req("/api/practice?case=" + id, owner))).status,
      200,
    );
    assert.equal(requests.length, 2);
  } finally {
    await new Promise<void>((resolve, reject) =>
      service.close((error) => (error ? reject(error) : resolve())),
    );
    await closeDatabaseForTests();
  }
});
