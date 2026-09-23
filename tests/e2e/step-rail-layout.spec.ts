import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("five-step labels retain whole numbers and words across languages and widths", async ({ page }, testInfo) => {
  await page.request.post("/api/auth/signup", {
    data: {
      email: `step-rail-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
      password: "a strong step rail fixture password",
    },
  }).then(response => expect(response.status()).toBe(201));
  const goal = await page.request.post("/api/people/goals", {
    headers: { origin: "http://127.0.0.1:3000" },
    data: {
      desiredState: "Keep evenings free from nonurgent work.",
      whyItMatters: "Time with family.",
      successConditions: "Four uninterrupted evenings this week.",
      acceptedTradeoffs: "Routine replies wait until morning.",
      nonNegotiables: "Urgent calls can still get through.",
      measures: "Interrupted evenings",
    },
  });
  expect(goal.status()).toBe(201);
  await page.goto("/");
  await expect(page.getByRole("tab")).toHaveCount(5);

  for (const locale of ["vi", "en"] as const) {
    await page.locator("header select").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    for (const width of [1440, 320, 390, 640, 768, 1024, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      const metrics = await page.getByRole("tab").evaluateAll(async tabs => {
        await document.fonts.ready;
        return tabs.map(tab => {
          const number = tab.children[0];
          const label = tab.children[1];
          const words = (element: Element) => {
            const text = element.firstChild;
            if (!text || text.nodeType !== Node.TEXT_NODE) throw new Error("Expected a plain step label");
            return Array.from((text.textContent ?? "").matchAll(/\S+/gu), match => {
              const range = document.createRange();
              range.setStart(text, match.index);
              range.setEnd(text, match.index + match[0].length);
              const rects = Array.from(range.getClientRects());
              const tops = rects.map(rect => rect.top);
              return {
                text: match[0],
                lineDelta: Math.max(...tops) - Math.min(...tops),
                overflow: Math.max(...rects.map(rect => rect.right)) - tab.getBoundingClientRect().right,
              };
            });
          };
          return {
            number: number.textContent,
            words: [...words(number), ...words(label)],
            fontSize: Number.parseFloat(getComputedStyle(label).fontSize),
          };
        });
      });
      expect(metrics.map(item => item.number)).toEqual(["01", "02", "03", "04", "05"]);
      for (const item of metrics) {
        expect(item.fontSize, `${locale}/${width}: step label size`).toBeGreaterThanOrEqual(12);
        for (const word of item.words) {
          expect(word.lineDelta, `${locale}/${width}: split word ${word.text}`).toBeLessThanOrEqual(1);
          expect(word.overflow, `${locale}/${width}: overflowing word ${word.text}`).toBeLessThanOrEqual(1);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (locale === "vi" && [320, 390, 1440].includes(width)) {
        await testInfo.attach(`step-rail-vi-${width}`, {
          body: await page.locator("#five-steps").screenshot(), contentType: "image/png",
        });
      }
    }
  }
});
