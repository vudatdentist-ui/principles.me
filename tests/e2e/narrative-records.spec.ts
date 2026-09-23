import { expect, test, type Page, type TestInfo } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

const record = {
  goal: "Dành buổi tối cho gia đình, không mang việc về nhà.",
  reality: "Tuần này, tôi trả lời tin nhắn công việc trong ba bữa tối.",
  problem: "Tin nhắn không khẩn cấp vẫn làm gián đoạn bữa tối.",
  hypothesis: "Nhóm chưa thống nhất khi nào cần phản hồi ngoài giờ.",
  uncertainty: "Chưa biết có bao nhiêu tin nhắn thực sự khẩn cấp.",
  design: "Thống nhất một kênh riêng cho việc khẩn cấp; tin nhắn khác để sáng hôm sau.",
  action: "Trao đổi với nhóm về thời gian phản hồi.",
  outcome: "Bốn bữa tối liên tiếp không bị gián đoạn; một cuộc gọi khẩn vẫn được xử lý.",
  lesson: "Thỏa thuận rõ giúp tôi bớt kiểm tra điện thoại trong bữa tối.",
};

async function post<T>(page: Page, path: string, data: unknown): Promise<T> {
  const response = await page.request.post(path, {
    data, headers: { origin: "http://127.0.0.1:3000" },
  });
  expect(response.ok(), `${path}: ${response.status()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

async function account(page: Page) {
  await post(page, "/api/auth/signup", {
    email: `narrative-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    password: "a strong narrative fixture password",
  });
}

async function seed(page: Page) {
  const { goal } = await post<{ goal: { id: string } }>(page, "/api/people/goals", {
    desiredState: record.goal,
    whyItMatters: "Time together without interruptions.",
    successConditions: "Four uninterrupted dinners in a week.",
    acceptedTradeoffs: "Nonurgent responses wait until morning.",
    nonNegotiables: "Urgent calls still get through.", measures: "Dinners interrupted",
  });
  const { reality } = await post<{ reality: { observationId: string } }>(page, "/api/people/reality", {
    goalId: goal.id, statement: record.reality,
  });
  const { problem } = await post<{ problem: { id: string } }>(page, "/api/people/problems", {
    goalId: goal.id, observationId: reality.observationId,
    statement: record.problem, gap: record.problem,
  });
  await post(page, "/api/people/diagnoses/propose", { problemId: problem.id });
  const beforeDiagnosis = await (await page.request.get("/api/evolution/state")).json();
  expect(beforeDiagnosis.diagnosis).toBeNull();
  const { diagnosis } = await post<{ diagnosis: { id: string } }>(page, "/api/people/diagnoses", {
    problemId: problem.id, symptom: record.problem,
    rootCauseHypothesis: record.hypothesis, uncertainty: record.uncertainty,
    supportingEvidence: record.reality, contradictingEvidence: "One call was urgent.",
    alternativeHypotheses: "I may also be checking out of habit.", confidence: null,
  });
  await post(page, "/api/people/designs/propose", { diagnosisId: diagnosis.id });
  const beforeDesign = await (await page.request.get("/api/evolution/state")).json();
  expect(beforeDesign.design).toBeNull();
  await post(page, "/api/people/designs", {
    diagnosisId: diagnosis.id, machineChange: record.design,
    expectedResult: "Four uninterrupted dinners in a week.",
    successSignal: "No nonurgent replies during dinner.",
    rationale: "Separate emergencies from requests that can wait.", actions: [record.action],
  });
  return { goal, problem };
}

async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await testInfo.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}

test("Me tells the selected case and keeps action, outcome and reflection distinct", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await account(page);
  await seed(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText(record.goal);
  await expect(page.locator("#current-action")).toContainText(record.reality);
  await expect(page.locator("#current-action")).toContainText(record.design);
  await expect(page.locator("#current-action").getByText("Hoàn thành việc chưa có nghĩa là đã tạo ra kết quả.", { exact: false })).toHaveCount(1);
  await expect(page.locator("h1, h2").filter({ hasText: "Lúc này, điều gì đáng" })).toHaveCount(0);
  await noOverflow(page);
  await screenshot(page, testInfo, "narrative-me-vi-desktop-do");

  const historyLink = page.locator('nav a[href="#cycle-history"]');
  await historyLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#cycle-history$/);
  await page.locator("#cycle-history > summary").click();
  await expect(page.locator("#cycle-history")).toContainText(record.uncertainty);
  await expect(page.locator("#cycle-history > ol > li")).toHaveCount(2);

  await page.locator('nav a[href="#five-steps"]').click();
  await expect(page.getByRole("tab")).toHaveCount(5);
  await page.getByRole("tab").first().focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab").last()).toHaveAttribute("aria-selected", "true");

  for (const width of [390, 1024, 1920]) {
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await noOverflow(page);
    await screenshot(page, testInfo, `narrative-me-vi-${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("combobox", { name: "Ngôn ngữ" }).selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toHaveText(record.goal);
  await screenshot(page, testInfo, "narrative-me-en-user-content-unchanged");

  const response = page.waitForResponse(r => r.url().endsWith("/api/people/actions") && r.request().method() === "POST");
  await page.locator("#current-action").getByRole("button", { name: /^Complete / }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByLabel("Actual outcome")).toBeVisible();
  const state = await (await page.request.get("/api/evolution/state")).json();
  expect(state.stage).toBe("outcome");
  expect(state.outcome).toBeNull();
  await page.getByLabel("Actual outcome").fill(record.outcome);
  await page.getByRole("button", { name: "improved", exact: true }).click();
  await page.getByRole("button", { name: "Record outcome", exact: true }).click();
  await expect(page.getByLabel("What did this teach you?")).toBeVisible();
  await expect(page.locator("#current-action")).toContainText(record.outcome);
  await page.getByLabel("What did this teach you?").fill(record.lesson);
  await page.getByRole("button", { name: "Save reflection", exact: true }).click();
  await expect(page.getByRole("button", { name: "Distill a principle", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Language" }).selectOption("vi");
  await screenshot(page, testInfo, "narrative-me-vi-observed-outcome");

  await page.goto("/learning");
  const chapters = page.locator('section[aria-label="Không gian Học hỏi"] > section');
  expect(await chapters.evaluateAll(nodes => nodes.map(n => n.id))).toEqual([
    "learning-reflection", "learning-pattern", "learning-principle",
  ]);
  await expect(page.locator("#learning-reflection")).toContainText(record.lesson);
  await page.locator("#learning-reflection details > summary").first().click();
  await expect(page.locator("#learning-reflection")).toContainText(record.goal);
  await expect(page.locator("#learning-reflection")).toContainText(record.problem);
  await expect(page.locator("#learning-reflection")).toContainText(record.outcome);
  await screenshot(page, testInfo, "narrative-learning-vi-case-context");
  await page.locator("#learning-reflection").getByRole("button", { name: "Chắt lọc nguyên tắc", exact: true }).click();
  await expect(page.locator('#learning-principle article[id^="principle-"]')).toHaveCount(1);
  const principleId = await page.locator('#learning-principle article[id^="principle-"]').getAttribute("id");
  await page.getByLabel("Tìm nguyên tắc", { exact: true }).fill("no-matching-rule");
  await expect(page.locator('#learning-principle article[id^="principle-"]')).toHaveCount(0);
  await page.locator(`#learning-reflection a[href="#${principleId}"]`).click();
  await expect(page.locator(`#${principleId}`)).toBeFocused();
  await expect(page.getByLabel("Tìm nguyên tắc", { exact: true })).toHaveValue("");
  await screenshot(page, testInfo, "narrative-learning-vi-origin-link");
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await screenshot(page, testInfo, "narrative-learning-vi-mobile");
});

test("retired interface slogans are not filters on user-authored records", async ({ page }) => {
  await account(page);
  await post(page, "/api/people/goals", {
    desiredState: "What deserves attention now?",
    whyItMatters: "This is my chosen research question.",
    successConditions: "An answer based on my own cases.",
    acceptedTradeoffs: "Less time browsing unrelated projects.",
    nonNegotiables: "Keep my original wording.", measures: "Reviewed cases",
  });
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("What deserves attention now?");
});

test("Knowledge keeps question, answer and attributable sources without a motivational footer", async ({ page }, testInfo) => {
  await account(page);
  await page.goto("/knowledge");
  await page.route("**/api/ask", route => route.fulfill({
    status: 200, contentType: "application/x-ndjson; charset=utf-8",
    body: [
      { type: "sources", live: "disabled", private: "ok", personal: "empty", references: [{
        key: "R1", provider: "ragflow", publishedAt: null, retrievedAt: "2026-09-23T00:00:00Z",
        snippet: record.reality, sourceType: "ragflow", title: "Ghi chép tuần", url: null,
      }] },
      { type: "token", token: "Ghi chép cho thấy ba bữa tối bị gián đoạn [R1]. Chưa đủ cơ sở để kết luận về nguyên nhân." },
      { type: "done" },
    ].map(event => JSON.stringify(event)).join("\n"),
  }));
  await page.getByLabel("Câu hỏi", { exact: true }).fill("Điều gì làm gián đoạn bữa tối?");
  await page.getByRole("button", { name: "Hỏi", exact: true }).click();
  await expect(page.locator("#knowledge-answer article")).toContainText("[R1]");
  await expect(page.locator("#knowledge-sources")).toContainText("Ghi chép tuần");
  await expect(page.getByText("What should this change in your next decision?", { exact: true })).toHaveCount(0);
  await page.locator("#knowledge-sources details summary").click();
  await expect(page.locator("#knowledge-sources")).toContainText(record.reality);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await screenshot(page, testInfo, "narrative-knowledge-vi-sources");
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await screenshot(page, testInfo, "narrative-knowledge-vi-mobile");
});


test("Organization chapters use actual purpose and attributable evidence", async ({ page }, testInfo) => {
  await account(page);
  const me = await (await page.request.get("/api/me")).json();
  const title = "Nhóm vận hành";
  const purpose = "Giải quyết việc trong ngày, giữ buổi tối cho gia đình.";
  const created = await post<{ organizations: Array<{ handle: string }> }>(page, "/api/organization/workspaces", { name: title, purpose });
  const handle = created.organizations[0].handle;
  await post(page, "/api/organization/issues", {
    organizationHandle: handle, title: record.problem,
    observedReality: record.reality, tension: "Lịch phản hồi chưa rõ.",
  });
  await post(page, "/api/organization/context-evidence", {
    organizationHandle: handle, email: me.user.email,
    context: "Phản hồi ngoài giờ", observation: record.reality,
    evidenceFor: "Ghi nhận trong tuần", evidenceAgainst: "Một cuộc gọi là khẩn cấp.",
  });
  await page.goto("/organization");
  await expect(page.locator("h1")).toHaveText(title);
  await expect(page.locator("#organization-context")).toContainText(purpose);
  await expect(page.locator("#organization-context")).toContainText(record.reality);
  await page.locator("#organization-evidence summary").click();
  await expect(page.locator("#organization-evidence")).toContainText(me.user.email);
  await expect(page.locator("#organization-evidence")).toContainText("Một cuộc gọi là khẩn cấp.");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await noOverflow(page);
    await screenshot(page, testInfo, `narrative-organization-vi-${width}`);
  }
});
