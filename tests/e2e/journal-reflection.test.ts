import { expect, test } from "@playwright/test";

test.describe("Journal + reflection", () => {
  test("experience becomes an explicitly adopted principle with provenance", async ({
    page,
  }) => {
    await page.goto("/journal");
    await expect(page.getByLabel("New journal entry")).toBeVisible();
    const { request } = page.context();

    const experience = `Designer missed another deadline ${crypto.randomUUID()}.`;
    const candidateStatement =
      "If ownership matters, define the owner and deadline before work begins.";

    const createResponse = await request.post("/api/journal", {
      data: { body: experience },
    });
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as {
      entry: { id: string };
    };
    const entryId = created.entry.id;

    const listResponse = await request.get("/api/journal");
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
      }
    );
    expect(reflectionResponse.status()).toBe(200);

    const detailBeforeAdoption = await request.get(`/api/journal/${entryId}`);
    expect(detailBeforeAdoption.status()).toBe(200);
    const pending = (await detailBeforeAdoption.json()) as {
      candidate: { id: string; status: string };
      principles: unknown[];
    };
    expect(pending.candidate.status).toBe("pending");
    expect(pending.principles).toHaveLength(0);

    const assistResponse = await request.post(
      `/api/journal/${entryId}/reflection/assist`
    );
    expect(assistResponse.status()).toBe(200);
    const assist = await assistResponse.json();
    expect(assist.source).toBe("journal-cortex-adapter");
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
      }
    );
    expect(adoptResponse.status()).toBe(200);

    const detailAfterAdoption = await request.get(`/api/journal/${entryId}`);
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

    const principlesResponse = await request.get("/api/principles");
    expect(principlesResponse.status()).toBe(200);
    expect(JSON.stringify(await principlesResponse.json())).toContain(
      editedStatement
    );

    const deleteResponse = await request.delete(`/api/journal/${entryId}`);
    expect(deleteResponse.status()).toBe(204);
  });

  test("rejected candidate never becomes a principle", async ({ page }) => {
    await page.goto("/journal");
    await expect(page.getByLabel("New journal entry")).toBeVisible();
    const { request } = page.context();

    const createResponse = await request.post("/api/journal", {
      data: { body: `Conflict ${crypto.randomUUID()}` },
    });
    const created = (await createResponse.json()) as {
      entry: { id: string };
    };

    await request.put(`/api/journal/${created.entry.id}/reflection`, {
      data: {
        candidate: { statement: "Never make this automatic." },
        text: "This is too specific to become a rule.",
      },
    });
    const detailResponse = await request.get(
      `/api/journal/${created.entry.id}`
    );
    const detail = (await detailResponse.json()) as {
      candidate: { id: string };
    };

    const rejectResponse = await request.patch(
      `/api/journal/${created.entry.id}/reflection`,
      {
        data: { action: "reject", candidateId: detail.candidate.id },
      }
    );
    expect(rejectResponse.status()).toBe(200);

    const afterRejectResponse = await request.get(
      `/api/journal/${created.entry.id}`
    );
    const afterReject = (await afterRejectResponse.json()) as {
      candidate: { status: string };
      principles: unknown[];
    };
    expect(afterReject.candidate.status).toBe("rejected");
    expect(afterReject.principles).toHaveLength(0);

    await request.delete(`/api/journal/${created.entry.id}`);
  });
});
