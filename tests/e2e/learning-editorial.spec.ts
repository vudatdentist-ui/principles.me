import { expect, test } from "@playwright/test";

const password = "a strong learning editorial password";

async function createAccount(page: import("@playwright/test").Page) {
  const email = `learning-editorial-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: "Create account" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const signupResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/signup") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create account" }).last().click();
  expect((await signupResponse).status()).toBe(201);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "What deserves attention now?" }),
  ).toBeVisible();
}

test("Learning stays a bounded editorial sequence on wide desktops", async ({
  page,
}) => {
  await page.setViewportSize({ height: 1080, width: 1920 });
  await createAccount(page);

  for (const viewport of [
    { height: 1080, width: 1920 },
    { height: 1440, width: 2560 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/learning");
    await expect(
      page.getByRole("heading", { name: "What is reality teaching you?" }),
    ).toBeVisible();

    const currentScene = page.getByLabel("Current learning narrative");
    const chapterNav = page.getByRole("navigation", { name: "Learning chapters" });
    const learningScene = page.getByLabel("Learning working scene");

    await expect(currentScene).toBeVisible();
    await expect(chapterNav).toBeVisible();
    await expect(learningScene).toBeVisible();
    await expect(currentScene.locator("dl")).toBeHidden();
    await expect(chapterNav.locator("small").first()).toBeHidden();

    const metrics = await page.evaluate(() => {
      const title = document.querySelector<HTMLElement>("#learning-title");
      const currentScene = document.querySelector<HTMLElement>(
        'aside[aria-label="Current learning narrative"]',
      );
      const chapterNav = document.querySelector<HTMLElement>(
        'nav[aria-label="Learning chapters"]',
      );
      const workingScene = document.querySelector<HTMLElement>(
        'section[aria-label="Learning working scene"]',
      );
      const chapters = Array.from(
        workingScene?.querySelectorAll<HTMLElement>(":scope > section") ?? [],
      );

      const titleStyle = title ? getComputedStyle(title) : null;
      const currentSceneBox = currentScene?.getBoundingClientRect();
      const chapterNavBox = chapterNav?.getBoundingClientRect();
      const workingSceneBox = workingScene?.getBoundingClientRect();
      const chapterBoxes = chapters.map((chapter) => {
        const box = chapter.getBoundingClientRect();
        const header = chapter.querySelector<HTMLElement>(":scope > div:first-child");
        const content = chapter.querySelector<HTMLElement>(
          ":scope > div:not(:first-child)",
        );
        const headerBox = header?.getBoundingClientRect();
        const contentBox = content?.getBoundingClientRect();
        return {
          bottom: box.bottom,
          contentLeft: contentBox?.left ?? -1,
          contentWidth: contentBox?.width ?? Number.POSITIVE_INFINITY,
          headerLeft: headerBox?.left ?? -1,
          left: box.left,
          top: box.top,
          width: box.width,
        };
      });

      return {
        chapterBoxes,
        chapterNavWidth: chapterNavBox?.width ?? Number.POSITIVE_INFINITY,
        currentSceneWidth:
          currentSceneBox?.width ?? Number.POSITIVE_INFINITY,
        pageWidth: document.documentElement.scrollWidth,
        titleFontSize: titleStyle
          ? Number.parseFloat(titleStyle.fontSize)
          : Number.POSITIVE_INFINITY,
        viewportWidth: window.innerWidth,
        workingSceneWidth:
          workingSceneBox?.width ?? Number.POSITIVE_INFINITY,
      };
    });

    expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.titleFontSize).toBeLessThanOrEqual(60);
    expect(metrics.currentSceneWidth).toBeLessThanOrEqual(380);
    expect(metrics.chapterNavWidth).toBeLessThanOrEqual(1122);
    expect(metrics.workingSceneWidth).toBeLessThanOrEqual(1122);
    expect(metrics.chapterBoxes).toHaveLength(3);

    for (const chapter of metrics.chapterBoxes) {
      expect(chapter.width).toBeLessThanOrEqual(1122);
      expect(chapter.contentWidth).toBeLessThanOrEqual(780);
      expect(chapter.contentLeft - chapter.headerLeft).toBeGreaterThan(240);
    }

    expect(metrics.chapterBoxes[1].top).toBeGreaterThanOrEqual(
      metrics.chapterBoxes[0].bottom - 1,
    );
    expect(metrics.chapterBoxes[2].top).toBeGreaterThanOrEqual(
      metrics.chapterBoxes[1].bottom - 1,
    );

    await test.info().attach(`learning-${viewport.width}px`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  }
});
