import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
page.setDefaultTimeout(10_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") {
    console.log("browser-console:", message.type(), message.text());
  }
});
try {
  await page.goto("http://localhost:3000", {
    timeout: 15_000,
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: /Think with/ }).waitFor();
  await page.waitForTimeout(1000);
  console.log("home:ok");

  await page
    .locator(".side-rail")
    .getByRole("button", { exact: true, name: "Brain" })
    .click();
  await page.getByRole("heading", { name: "Brain explorer" }).waitFor();
  console.log("brain-mode:ok");

  await page
    .locator(".side-rail")
    .getByRole("button", { name: "Council" })
    .click();
  await page.getByRole("heading", { name: "Ask the council." }).waitFor();
  await page
    .locator("#council-question")
    .fill("How should I test a cofounder decision?");
  await page
    .locator(".council-form")
    .getByRole("button", { name: "Ask Council" })
    .click();
  await page
    .locator('.workspace[data-route="response"]')
    .waitFor({ state: "attached" });
  await page.getByRole("heading", { name: /How should I test/ }).waitFor();
  await page.getByText("No evidence retrieved yet.").waitFor();
  console.log("vertical-no-evidence-guard:ok");

  await page.locator(".heading-actions .secondary-button").click();
  await page
    .getByRole("heading", { name: "Sources for this question." })
    .waitFor();
  await page.getByText("No evidence retrieved.").waitFor();
  console.log("sources:ok");

  await page.screenshot({
    fullPage: true,
    path: "output/playwright/principles-home.png",
  });
  if (errors.length) {
    throw new Error(`Browser page errors: ${errors.join("; ")}`);
  }
} finally {
  await browser.close();
}
