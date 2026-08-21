import type { Page } from "@playwright/test";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

export async function blockExternalNetwork(page: Page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());

    if (LOCAL_HOSTS.has(url.hostname)) {
      await route.continue();
      return;
    }

    await route.abort("blockedbyclient");
  });
}
