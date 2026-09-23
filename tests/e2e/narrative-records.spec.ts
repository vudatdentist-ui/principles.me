import { expect, type Page, type TestInfo, test } from "@playwright/test";

const origin = "http://127.0.0.1:3000";
// Synthetic records stay identical when only the interface language changes.
const record = {
  goal: "Không nhận thêm việc khi lịch đã kín.",
  reality: "Tuần này, tôi nhận ba yêu cầu mới trước khi kiểm tra lịch.",
  problem: "Tôi nhận việc khi chưa biết mình còn bao nhiêu thời gian.",
  gap: "Kế hoạch đã kín nhưng tôi vẫn nhận thêm việc.",
  design: "Kiểm tra lịch trước khi trả lời một yêu cầu mới.",
  action: "Dành mười phút xem lại lịch tuần.",
  happened: "Hôm qua tôi hoãn một yêu cầu sau khi xem lại lịch.",
  learning: "Xem lại lịch giúp tôi nhận ra phần việc chưa hoàn thành.",
  rule: "Xem lại thời gian còn trống trước khi cam kết.",
  question: "Tôi cần kiểm tra điều gì trước khi nhận việc?",
  organization: "Nhóm thử nghiệm narrative",
  purpose: "Cùng thử một cách phân công rõ ràng hơn.",
};

async function post<T>(page: Page, path: string, data: unknown): Promise<T> {
  const response = await page.request.post(path, { data, headers: { origin } });
  expect(response.ok(), `${path}: ${response.status()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

async function account(page: Page, locale: "vi" | "en") {
  await page.addInitScript((selected) => {
    localStorage.setItem("principles.locale", selected);
  }, locale);
  await post(page, "/api/auth/signup", {
    email: `narrative-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    password: "isolated narrative regression password",
  });
}

async function seed(page: Page, goalText = record.goal) {
  const { goal } = await post<{ goal: { id: string } }>(
    page,
    "/api/people/goals",
    {
      desiredState: goalText,
      whyItMatters: "Protect time for existing commitments.",
      successConditions: "New work is considered against the calendar.",
      acceptedTradeoffs: "Decline some new work.",
      nonNegotiables: "Honor existing commitments.",
      measures: "",
    },
  );
  const { reality } = await post<{ reality: { observationId: string } }>(
    page,
    "/api/people/reality",
    {
      goalId: goal.id,
      statement: record.reality,
    },
  );
  const { problem } = await post<{ problem: { id: string } }>(
    page,
    "/api/people/problems",
    {
      goalId: goal.id,
      observationId: reality.observationId,
      gap: record.gap,
      statement: record.problem,
    },
  );
  const { diagnosis } = await post<{ diagnosis: { id: string } }>(
    page,
    "/api/people/diagnoses",
    {
      problemId: problem.id,
      symptom: record.problem,
      rootCauseHypothesis:
        "The calendar is not checked at the time of commitment.",
      supportingEvidence: record.reality,
      uncertainty:
        "This is a hypothesis from one week, not an established cause.",
    },
  );
  await post(page, "/api/people/designs", {
    diagnosisId: diagnosis.id,
    machineChange: record.design,
    expectedResult: "Commitments fit the available time.",
    successSignal: "Observe the next new request against the calendar.",
    rationale: "Make available time visible before committing.",
    actions: [record.action],
  });
  return { goalId: goal.id, problemId: problem.id };
}

async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

for (const view of [
  { locale: "vi" as const, width: 1440, height: 1000 },
  { locale: "vi" as const, width: 390, height: 844 },
  { locale: "en" as const, width: 1024, height: 768 },
]) {
  test(`record-led narrative ${view.locale} ${view.width}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: view.width, height: view.height });
    await account(page, view.locale);
    const context = await seed(page);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", view.locale);
    await expect(page.locator("#me-title")).toHaveText(record.goal);
    await expect(page.locator("#next-action-title")).toHaveText(record.design);
    const complete = page.getByRole("button", {
      name:
        view.locale === "vi"
          ? `Đánh dấu hoàn tất: ${record.action}`
          : `Complete ${record.action}`,
      exact: true,
    });
    await expect(complete).toBeVisible();
    const rule =
      view.locale === "vi"
        ? "Hoàn thành việc chưa có nghĩa là đã tạo ra kết quả. Hãy ghi nhận điều thực sự đã thay đổi."
        : "Completing actions is not an outcome. Record what actually changed.";
    await expect(page.getByText(rule, { exact: true })).toHaveCount(1);
    await page.evaluate(() => scrollTo(0, 0));
    if (view.width >= 1024)
      expect(
        (await complete.boundingBox())?.y ?? Number.POSITIVE_INFINITY,
      ).toBeLessThan(view.height);
    await screenshot(page, testInfo, `me-${view.locale}-${view.width}`);
    await complete.click();
    await expect(page.locator("textarea[aria-label]")).toBeVisible();
    const state = await (await page.request.get("/api/evolution/state")).json();
    expect(state.stage).toBe("outcome");
    expect(state.outcome).toBeNull();
    await page.reload();
    await expect(
      page.getByRole("button", {
        name: view.locale === "vi" ? "Ghi nhận kết quả" : "Record outcome",
        exact: true,
      }),
    ).toBeDisabled();

    await post(page, "/api/people/reflections", {
      ...context,
      happened: record.happened,
      learning: record.learning,
      recurring: false,
      expected: "The request would fit into the week.",
      surprise: "Existing commitments took longer than expected.",
    });
    await post(page, "/api/people/principles", {
      rule: record.rule,
      trigger: "Before accepting a new request",
      rationale: "An initial rule to test, not established truth.",
    });
    await page.goto("/learning");
    const chapters = page.locator(
      "#learning-reflection, #learning-pattern, #learning-principle",
    );
    expect(
      await chapters.evaluateAll((nodes) => nodes.map((node) => node.id)),
    ).toEqual([
      "learning-reflection",
      "learning-pattern",
      "learning-principle",
    ]);
    const event = page
      .locator("#learning-reflection")
      .getByRole("heading", { name: record.happened, exact: true });
    await expect(event).toBeVisible();
    const lesson = page.locator("#learning-reflection article > p");
    await expect(lesson).toContainText(record.learning);
    expect(
      (await event.boundingBox())?.y ?? Number.POSITIVE_INFINITY,
    ).toBeLessThan((await lesson.boundingBox())?.y ?? Number.NEGATIVE_INFINITY);
    const library = page.locator('nav a[href="#learning-principle"]');
    await library.click();
    await expect(
      page
        .locator("#learning-principle")
        .getByRole("heading", { name: record.rule }),
    ).toBeInViewport();
    await page.evaluate(() => scrollTo(0, 0));
    await screenshot(page, testInfo, `learning-${view.locale}-${view.width}`);

    await page.goto("/knowledge");
    await page.route("**/api/ask", (route) =>
      route.fulfill({
        contentType: "application/x-ndjson",
        body: [
          {
            type: "sources",
            private: "ok",
            personal: "ok",
            live: "disabled",
            references: [
              {
                key: "R1",
                title: "Synthetic test note",
                snippet: record.reality,
                provider: "ragflow",
                sourceType: "ragflow",
                url: null,
                publishedAt: null,
                retrievedAt: "2026-09-23T00:00:00Z",
              },
            ],
          },
          { type: "token", token: `${record.learning} [R1]` },
          { type: "done" },
        ]
          .map((value) => JSON.stringify(value))
          .join("\n")
          .concat("\n"),
      }),
    );
    await page.locator("#question").fill(record.question);
    await page
      .getByRole("button", {
        name: view.locale === "vi" ? "Hỏi" : "Ask",
        exact: true,
      })
      .click();
    const question = page.getByRole("heading", {
      name: record.question,
      exact: true,
    });
    await expect(question).toBeVisible();
    await expect(
      page.getByText("Synthetic test note", { exact: true }),
    ).toBeVisible();
    await screenshot(page, testInfo, `knowledge-${view.locale}-${view.width}`);

    const org = await post<{ organizations: Array<{ handle: string }> }>(
      page,
      "/api/organization/workspaces",
      { name: record.organization, purpose: record.purpose },
    );
    await post(page, "/api/organization/issues", {
      organizationHandle: org.organizations[0].handle,
      title: "Requests accepted before checking capacity",
      observedReality: record.reality,
      tension: record.gap,
    });
    await page.goto("/organization");
    await expect(page.locator("#organization-title")).toHaveText(
      record.organization,
    );
    const hero = page.locator('section[aria-labelledby="organization-title"]');
    await expect(hero.getByText(record.purpose, { exact: true })).toHaveCount(
      1,
    );
    const issues = page.locator('section[aria-labelledby="issues-title"]');
    await expect(issues).toContainText(record.reality);
    await expect(issues).toContainText(record.gap);
    await screenshot(
      page,
      testInfo,
      `organization-${view.locale}-${view.width}`,
    );
  });
}

test("removing authored slogans never rewrites a user's record", async ({
  page,
}) => {
  await account(page, "vi");
  const userText = "What deserves attention now?";
  await seed(page, userText);
  await page.goto("/");
  await expect(page.locator("#me-title")).toHaveText(userText);
  await page.reload();
  await expect(page.locator("#me-title")).toHaveText(userText);
});
