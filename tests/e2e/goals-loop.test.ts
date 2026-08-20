import { expect, test } from "@playwright/test";

async function workspaceHeaders(page: import("@playwright/test").Page) {
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

test.describe("Goals execution loop", () => {
  test("persists goal, problem, diagnosis, principle and action", async ({
    page,
  }) => {
    await page.goto("/goals");
    await expect(page.getByLabel("New goal")).toBeVisible();
    const { request } = page.context();
    const headers = await workspaceHeaders(page);

    const goalResponse = await request.post("/api/goals", {
      data: { title: "Build a profitable Principles" },
      headers,
    });
    expect(goalResponse.ok()).toBeTruthy();
    const { goal } = await goalResponse.json();

    const problemResponse = await request.post(
      `/api/goals/${goal.id}/problems`,
      {
        data: { title: "Users don't return after first session" },
        headers,
      }
    );
    expect(problemResponse.ok()).toBeTruthy();
    const { problem } = await problemResponse.json();

    const commandUrl = `/api/goals/${goal.id}/problems/${problem.id}`;
    expect(
      (
        await request.patch(commandUrl, {
          data: {
            command: "save_diagnosis",
            rootCause:
              "The first session does not create a reusable operating rule.",
          },
          headers,
        })
      ).ok()
    ).toBeTruthy();

    expect(
      (
        await request.patch(commandUrl, {
          data: {
            command: "update_problem",
            principleCandidate:
              "If a session reveals a repeated obstacle, end with one reusable principle.",
          },
          headers,
        })
      ).ok()
    ).toBeTruthy();

    const adopted = await request.patch(commandUrl, {
      data: { command: "adopt_candidate" },
      headers,
    });
    expect(adopted.ok()).toBeTruthy();

    expect(
      (
        await request.patch(commandUrl, {
          data: {
            command: "add_action",
            title: "Test the principle capture flow",
          },
          headers,
        })
      ).ok()
    ).toBeTruthy();

    const detailResponse = await request.get(`/api/goals/${goal.id}`, {
      headers,
    });
    expect(detailResponse.ok()).toBeTruthy();
    const detail = await detailResponse.json();
    expect(detail.goal.title).toBe("Build a profitable Principles");
    expect(detail.problems).toHaveLength(1);
    expect(detail.problems[0].diagnosis.rootCause).toContain(
      "reusable operating rule"
    );
    expect(detail.problems[0].principles[0].statement).toContain(
      "repeated obstacle"
    );
    expect(detail.problems[0].principles[0].revision).toBe(1);
    expect(detail.problems[0].actions[0].title).toBe(
      "Test the principle capture flow"
    );
  });

  test("isolates goal ownership between workspace users", async ({
    browser,
  }) => {
    const ownerContext = await browser.newContext();
    const otherContext = await browser.newContext();

    try {
      const ownerPage = await ownerContext.newPage();
      const otherPage = await otherContext.newPage();
      await ownerPage.goto("/goals");
      await otherPage.goto("/goals");
      await expect(ownerPage.getByLabel("New goal")).toBeVisible();
      await expect(otherPage.getByLabel("New goal")).toBeVisible();

      const { request: ownerRequest } = ownerContext;
      const { request: otherRequest } = otherContext;
      const ownerHeaders = await workspaceHeaders(ownerPage);
      const otherHeaders = await workspaceHeaders(otherPage);
      const ownerResponse = await ownerRequest.post("/api/goals", {
        data: { title: "Owner only goal" },
        headers: ownerHeaders,
      });
      expect(ownerResponse.ok()).toBeTruthy();
      const { goal } = await ownerResponse.json();

      const problemResponse = await ownerRequest.post(
        `/api/goals/${goal.id}/problems`,
        { data: { title: "Private obstacle" }, headers: ownerHeaders }
      );
      expect(problemResponse.ok()).toBeTruthy();
      const { problem } = await problemResponse.json();

      const hiddenGoal = await otherRequest.get(`/api/goals/${goal.id}`, {
        headers: otherHeaders,
      });
      expect(hiddenGoal.status()).toBe(404);

      const crossUserMutation = await otherRequest.patch(
        `/api/goals/${goal.id}/problems/${problem.id}`,
        {
          data: { command: "save_diagnosis", rootCause: "Cross-user write" },
          headers: otherHeaders,
        }
      );
      expect(crossUserMutation.status()).toBe(404);
    } finally {
      await ownerContext.close();
      await otherContext.close();
    }
  });

  test("keeps the UI focused on the execution progression", async ({
    page,
  }) => {
    await page.goto("/goals");
    await page.getByLabel("New goal").fill("Ship Goals loop");
    await page.getByRole("button", { exact: true, name: "Add" }).click();
    await page.getByLabel("Add problem").fill("No focused problem flow");
    await page.getByRole("button", { exact: true, name: "+ Add" }).click();

    await expect(
      page.getByRole("heading", { name: "1 Problem" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "2 Diagnosis" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "3 Principle" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "4 Action" })).toBeVisible();
  });
});
