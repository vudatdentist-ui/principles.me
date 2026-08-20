import { expect, test } from "@playwright/test";

async function workspaceHeaders(page: import("@playwright/test").Page) {
  await page.evaluate(() => fetch("/api/journal"));
  await expect
    .poll(async () =>
      (await page.context().cookies()).some(
        (cookie) => cookie.name === "principles-workspace"
      )
    )
    .toBe(true);
  const workspaceCookie = (await page.context().cookies()).find(
    (item) => item.name === "principles-workspace"
  );
  if (!workspaceCookie) {
    throw new Error("Workspace cookie was not created.");
  }
  return { cookie: `${workspaceCookie.name}=${workspaceCookie.value}` };
}

test.describe("Journal + reflection", () => {
  test("experience becomes an explicitly adopted principle with provenance", async ({
    page,
  }) => {
    await page.goto("/journal");
    await expect(page.getByLabel("New journal entry")).toBeVisible();
    const { request } = page.context();
    const headers = await workspaceHeaders(page);

    const experience = `Designer missed another deadline ${crypto.randomUUID()}.`;
    const candidateStatement =
      "If ownership matters, define the owner and deadline before work begins.";

    const createResponse = await request.post("/api/journal", {
      data: { body: experience },
      headers,
    });
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as {
      entry: { id: string };
    };
    const entryId = created.entry.id;

    const listResponse = await request.get("/api/journal", { headers });
    expect(listResponse.status()).toBe(200);
    expect(JSON.stringify(await listResponse.json())).toContain(experience);

    const reflectionResponse = await request.put(
      `/api/journal/${entryId}/reflection`,
      {
        data: {
          candidate: {
            rationale: "Repeated unclear ownership caused avoidable rework.",
            statement: candidateStatement,
          },
          observation: "Unclear ownership keeps leading me to step in.",
          text: "I should make ownership explicit before the work starts.",
        },
        headers,
      }
    );
    expect(reflectionResponse.status()).toBe(200);

    const detailBeforeAdoption = await request.get(`/api/journal/${entryId}`, {
      headers,
    });
    expect(detailBeforeAdoption.status()).toBe(200);
    const pending = (await detailBeforeAdoption.json()) as {
      candidate: { id: string; status: string };
      principles: unknown[];
    };
    expect(pending.candidate.status).toBe("pending");
    expect(pending.principles).toHaveLength(0);

    const assistResponse = await request.post(
      `/api/journal/${entryId}/reflection/assist`,
      { headers }
    );
    expect(assistResponse.status()).toBe(200);
    const assist = await assistResponse.json();
    expect(assist.source).toBe("cortex");
    expect(assist.suggestion.question).toBeTruthy();

    const editedStatement = `${candidateStatement} Confirm it in writing.`;
    const editResponse = await request.patch(
      `/api/journal/${entryId}/reflection`,
      {
        data: {
          action: "edit",
          candidateId: pending.candidate.id,
          rationale: "Ownership needs an observable handoff.",
          statement: editedStatement,
        },
        headers,
      }
    );
    expect(editResponse.status()).toBe(200);

    const adoptResponse = await request.patch(
      `/api/journal/${entryId}/reflection`,
      {
        data: {
          action: "adopt",
          candidateId: pending.candidate.id,
          rationale: "Ownership needs an observable handoff.",
          statement: editedStatement,
        },
        headers,
      }
    );
    expect(adoptResponse.status()).toBe(200);

    const detailAfterAdoption = await request.get(`/api/journal/${entryId}`, {
      headers,
    });
    expect(detailAfterAdoption.status()).toBe(200);
    const adopted = (await detailAfterAdoption.json()) as {
      candidate: { status: string };
      principles: Array<{ relation: string; statement: string }>;
    };
    expect(adopted.candidate.status).toBe("adopted");
    expect(adopted.principles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relation: "origin",
          statement: editedStatement,
        }),
      ])
    );

    const principlesResponse = await request.get("/api/principles", {
      headers,
    });
    expect(principlesResponse.status()).toBe(200);
    expect(JSON.stringify(await principlesResponse.json())).toContain(
      editedStatement
    );

    const deleteResponse = await request.delete(`/api/journal/${entryId}`, {
      headers,
    });
    expect(deleteResponse.status()).toBe(204);
  });

  test("rejected candidate never becomes a principle", async ({ page }) => {
    await page.goto("/journal");
    await expect(page.getByLabel("New journal entry")).toBeVisible();
    const { request } = page.context();
    const headers = await workspaceHeaders(page);

    const createResponse = await request.post("/api/journal", {
      data: { body: `Conflict ${crypto.randomUUID()}` },
      headers,
    });
    const created = (await createResponse.json()) as {
      entry: { id: string };
    };

    await request.put(`/api/journal/${created.entry.id}/reflection`, {
      data: {
        candidate: { statement: "Never make this automatic." },
        text: "This is too specific to become a rule.",
      },
      headers,
    });
    const detailResponse = await request.get(
      `/api/journal/${created.entry.id}`,
      { headers }
    );
    const detail = (await detailResponse.json()) as {
      candidate: { id: string };
    };

    const rejectResponse = await request.patch(
      `/api/journal/${created.entry.id}/reflection`,
      {
        data: { action: "reject", candidateId: detail.candidate.id },
        headers,
      }
    );
    expect(rejectResponse.status()).toBe(200);

    const afterRejectResponse = await request.get(
      `/api/journal/${created.entry.id}`,
      { headers }
    );
    const afterReject = (await afterRejectResponse.json()) as {
      candidate: { status: string };
      principles: unknown[];
    };
    expect(afterReject.candidate.status).toBe("rejected");
    expect(afterReject.principles).toHaveLength(0);

    await request.delete(`/api/journal/${created.entry.id}`, { headers });
  });
});
