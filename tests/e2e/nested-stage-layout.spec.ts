import { expect, test } from "@playwright/test";

const password = "a strong nested stage regression password";

async function createAccount(page: import("@playwright/test").Page) {
  const email = `nested-stage-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
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
  await expect(
    page.getByRole("heading", { name: "New goal", level: 1, exact: true }),
  ).toBeVisible();
}

test("nested feature stages keep usable width on wide desktops", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ height: 1080, width: 1920 });
  await createAccount(page);

  for (const viewport of [
    { height: 1080, width: 1920 },
    { height: 1440, width: 2560 },
  ]) {
    await page.setViewportSize(viewport);

    await page.goto("/knowledge");
    await expect(
      page.getByRole("heading", { name: "Knowledge", level: 1, exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Knowledge working scene")).toBeVisible();

    const knowledge = await page.evaluate(() => {
      const scene = document.querySelector<HTMLElement>(
        'section[aria-label="Current knowledge narrative"]',
      );
      const form = scene?.querySelector<HTMLElement>(
        'form[aria-label="Knowledge working scene"]',
      );
      const copy = scene?.querySelector<HTMLElement>(":scope > div");
      const sceneBox = scene?.getBoundingClientRect();
      const formBox = form?.getBoundingClientRect();
      const copyBox = copy?.getBoundingClientRect();
      const style = scene ? getComputedStyle(scene) : null;
      return {
        copyTop: copyBox?.top ?? -1,
        copyWidth: copyBox?.width ?? 0,
        formTop: formBox?.top ?? -2,
        formWidth: formBox?.width ?? 0,
        pageWidth: document.documentElement.scrollWidth,
        paddingLeft: style ? Number.parseFloat(style.paddingLeft) : -1,
        paddingRight: style ? Number.parseFloat(style.paddingRight) : -1,
        sceneWidth: sceneBox?.width ?? 0,
        viewportWidth: window.innerWidth,
      };
    });

    expect(knowledge.pageWidth).toBeLessThanOrEqual(
      knowledge.viewportWidth + 1,
    );
    expect(knowledge.sceneWidth).toBeGreaterThanOrEqual(1080);
    expect(knowledge.sceneWidth).toBeLessThanOrEqual(1122);
    expect(knowledge.paddingLeft).toBeLessThanOrEqual(1);
    expect(knowledge.paddingRight).toBeLessThanOrEqual(1);
    expect(knowledge.copyWidth).toBeGreaterThanOrEqual(240);
    expect(knowledge.copyWidth).toBeLessThanOrEqual(280);
    expect(knowledge.formWidth).toBeGreaterThanOrEqual(700);
    expect(knowledge.formWidth).toBeLessThanOrEqual(800);
    expect(Math.abs(knowledge.copyTop - knowledge.formTop)).toBeLessThanOrEqual(2);

    await testInfo.attach(`knowledge-${viewport.width}x${viewport.height}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    await page.goto("/organization");
    await expect(
      page.getByRole("heading", { name: "Organization", level: 1, exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Current organization narrative")).toBeVisible();

    const organization = await page.evaluate(() => {
      const current = document.querySelector<HTMLElement>(
        'aside[aria-label="Current organization narrative"]',
      );
      const scene = current?.closest<HTMLElement>(
        'section[aria-labelledby="organization-title"]',
      ) ?? null;
      const sceneBox = scene?.getBoundingClientRect();
      const currentBox = current?.getBoundingClientRect();
      const style = scene ? getComputedStyle(scene) : null;
      return {
        currentWidth: currentBox?.width ?? 0,
        pageWidth: document.documentElement.scrollWidth,
        paddingLeft: style ? Number.parseFloat(style.paddingLeft) : -1,
        paddingRight: style ? Number.parseFloat(style.paddingRight) : -1,
        sceneWidth: sceneBox?.width ?? 0,
        viewportWidth: window.innerWidth,
      };
    });

    expect(organization.pageWidth).toBeLessThanOrEqual(
      organization.viewportWidth + 1,
    );
    expect(organization.sceneWidth).toBeGreaterThanOrEqual(1100);
    expect(organization.sceneWidth).toBeLessThanOrEqual(1122);
    expect(organization.paddingLeft).toBeLessThanOrEqual(1);
    expect(organization.paddingRight).toBeLessThanOrEqual(1);
    expect(organization.currentWidth).toBeGreaterThanOrEqual(320);
    expect(organization.currentWidth).toBeLessThanOrEqual(380);

    await testInfo.attach(`organization-${viewport.width}x${viewport.height}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  }
});
