import { expect, test } from "@playwright/test";

const password = "a strong readability password";

async function createAccount(page: import("@playwright/test").Page) {
  const email = `readability-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: "Create account" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const signupResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/signup") && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Create account" }).last().click();
  expect((await signupResponse).status()).toBe(201);
  await expect(
    page.getByRole("heading", { name: "New goal", level: 1, exact: true }),
  ).toBeVisible();
}

async function createGoal(page: import("@playwright/test").Page) {
  const answers = [
    "Build a company that can make routine decisions without depending on me.",
    "I want freedom without sacrificing decision quality.",
    "Routine operating decisions happen without waiting for my approval.",
    "I will stop being the default approver for low-risk operating decisions.",
    "Protect customer trust and irreversible financial decisions.",
  ];

  for (const [index, value] of answers.entries()) {
    const answer = page.getByLabel("Goal discovery answer");
    const continueButton = page.getByRole("button", { name: "Continue" });
    await expect(answer).toBeVisible();
    await answer.fill(value);
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    if (index < answers.length - 1) {
      await expect(answer).toHaveValue("");
    } else {
      await expect(page.getByRole("button", { name: "Add goal" })).toBeVisible();
    }
  }

  await page.getByRole("button", { name: "Add goal" }).click();
}

test("current action stays readable and complete on tablet landscape", async ({ page }) => {
  await page.setViewportSize({ height: 768, width: 1024 });
  await createAccount(page);
  await createGoal(page);

  await page.evaluate(() => window.scrollTo(0, 0));
  const firstViewport = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('section[aria-labelledby="me-title"]');
    const currentAction = document.querySelector<HTMLElement>('section[aria-label="Current action"]');
    const goals = document.querySelector<HTMLElement>('section[aria-label="My goals"]');
    return {
      actionTop: currentAction?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
      goalHeight: goals?.getBoundingClientRect().height ?? 0,
      heroHeight: hero?.getBoundingClientRect().height ?? Number.POSITIVE_INFINITY,
    };
  });

  expect(firstViewport.heroHeight).toBeLessThan(420);
  expect(firstViewport.goalHeight).toBeLessThan(150);
  expect(firstViewport.actionTop).toBeLessThan(720);

  await page
    .getByLabel("What is actually true?")
    .fill("Three routine operating decisions waited for my approval this week.");
  await page.getByRole("button", { name: "Record reality" }).click();

  await page.getByRole("button", { name: "Find the problem" }).click();
  await page.getByRole("button", { name: "Name this problem" }).click();

  await page.getByRole("button", { name: "Diagnose the root cause" }).click();
  await expect(page.getByRole("textbox", { name: "Root-cause hypothesis" })).toBeVisible();
  await page.getByRole("button", { name: "Accept this diagnosis" }).click();

  await page.getByRole("button", { name: "Design the machine" }).click();

  const currentAction = page.locator('section[aria-label="Current action"]');
  await expect(page.locator("#me-title")).toHaveText("Build a company that can make routine decisions without depending on me.");
  await expect(currentAction.getByText("Reality", { exact: true })).toBeVisible();
  await expect(currentAction.getByText("Gap", { exact: true })).toBeVisible();

  const machineChange = page.getByRole("textbox", { name: "Machine change" });
  const expectedResult = page.getByRole("textbox", { name: "Expected result" });
  const successSignal = page.getByRole("textbox", { name: "Success signal" });
  await expect(machineChange).toBeVisible();
  await expect(expectedResult).toBeVisible();
  await expect(successSignal).toBeVisible();

  const metrics = await page.evaluate(() => {
    const section = document.querySelector<HTMLElement>('section[aria-label="Current action"]');
    const heading = section?.querySelector<HTMLElement>(":scope > h2");
    const body = section?.querySelector<HTMLElement>(":scope > div");
    const textareas = Array.from(
      section?.querySelectorAll<HTMLTextAreaElement>("textarea") ?? []
    ).map((textarea) => {
      const style = getComputedStyle(textarea);
      return {
        clientHeight: textarea.clientHeight,
        fontSize: Number.parseFloat(style.fontSize),
        lineHeight: Number.parseFloat(style.lineHeight),
        scrollHeight: textarea.scrollHeight,
      };
    });
    const headingBox = heading?.getBoundingClientRect();
    const bodyBox = body?.getBoundingClientRect();
    return {
      bodyLeft: bodyBox?.left ?? -1,
      headingLeft: headingBox?.left ?? -2,
      textareas,
    };
  });

  expect(Math.abs(metrics.bodyLeft - metrics.headingLeft)).toBeLessThan(2);
  expect(metrics.textareas.length).toBeGreaterThanOrEqual(3);

  for (const textarea of metrics.textareas) {
    expect(textarea.fontSize).toBeGreaterThanOrEqual(16);
    expect(textarea.fontSize).toBeLessThanOrEqual(20);
    expect(textarea.lineHeight).toBeGreaterThanOrEqual(textarea.fontSize * 1.5);
    expect(textarea.scrollHeight).toBeLessThanOrEqual(textarea.clientHeight + 2);
  }

  const primaryNav = page.getByRole("navigation", { name: "Primary" });
  const navFontSize = await primaryNav
    .getByRole("link", { name: "Me", exact: true })
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(navFontSize).toBeGreaterThanOrEqual(11);
});

test("Me stays a bounded narrative stage on wide desktop", async ({ page }) => {
  await page.setViewportSize({ height: 1080, width: 1920 });
  await createAccount(page);
  await createGoal(page);

  const goals = page.locator('section[aria-label="My goals"]');
  const currentAction = page.locator('section[aria-label="Current action"]');
  await expect(goals).toBeVisible();
  await expect(currentAction).toBeVisible();
  await expect(goals.locator('button[aria-pressed="true"]')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));

  const metrics = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('section[aria-labelledby="me-title"]');
    const heroTitle = hero?.querySelector<HTMLElement>("h1");
    const goals = document.querySelector<HTMLElement>('section[aria-label="My goals"]');
    const currentAction = document.querySelector<HTMLElement>('section[aria-label="Current action"]');
    const actionTitle = currentAction?.querySelector<HTMLElement>(":scope > h2");
    const context = currentAction?.querySelector<HTMLElement>(
      ':scope > section[aria-label="Reality and gap"]'
    );
    const work = currentAction?.querySelector<HTMLElement>(":scope > div");

    const heroBox = hero?.getBoundingClientRect();
    const heroTitleBox = heroTitle?.getBoundingClientRect();
    const goalsBox = goals?.getBoundingClientRect();
    const actionBox = currentAction?.getBoundingClientRect();
    const titleBox = actionTitle?.getBoundingClientRect();
    const contextBox = context?.getBoundingClientRect();
    const workBox = work?.getBoundingClientRect();
    const heroTitleStyle = heroTitle ? getComputedStyle(heroTitle) : null;

    return {
      actionTop: actionBox?.top ?? Number.POSITIVE_INFINITY,
      contextLeft: contextBox?.left ?? -1,
      contextWidth: contextBox?.width ?? Number.POSITIVE_INFINITY,
      goalHeight: goalsBox?.height ?? Number.POSITIVE_INFINITY,
      heroHeight: heroBox?.height ?? Number.POSITIVE_INFINITY,
      heroTitleFontSize: heroTitleStyle
        ? Number.parseFloat(heroTitleStyle.fontSize)
        : Number.POSITIVE_INFINITY,
      heroTitleLeft: heroTitleBox?.left ?? -1,
      heroTitleTransform: heroTitleStyle?.textTransform ?? "unknown",
      pageWidth: document.documentElement.scrollWidth,
      titleBottom: titleBox?.bottom ?? Number.POSITIVE_INFINITY,
      workLeft: workBox?.left ?? -1,
      workTop: workBox?.top ?? -1,
      workWidth: workBox?.width ?? Number.POSITIVE_INFINITY,
    };
  });

  expect(metrics.pageWidth).toBeLessThanOrEqual(1921);
  expect(metrics.heroHeight).toBeLessThan(280);
  expect(metrics.goalHeight).toBeLessThan(100);
  expect(metrics.actionTop).toBeLessThan(380);
  expect(metrics.heroTitleFontSize).toBeLessThanOrEqual(64);
  expect(metrics.heroTitleTransform).toBe("none");
  expect(metrics.heroTitleLeft).toBeGreaterThan(300);
  expect(metrics.contextWidth).toBeLessThanOrEqual(280);
  expect(metrics.workWidth).toBeLessThanOrEqual(780);
  expect(metrics.workLeft - metrics.contextLeft).toBeGreaterThan(260);
  expect(metrics.workTop).toBeGreaterThan(metrics.titleBottom);
  expect(metrics.workLeft + metrics.workWidth - metrics.contextLeft).toBeLessThanOrEqual(1120);
});
