import type { Page } from "@playwright/test";
import type { DecisionStreamEvent } from "@/features/decision/stream-events";
import { encodeDecisionEventsAsNdjson } from "./ndjson";

export type MockDecisionTransportOptions = {
  endpoint: string;
  events: readonly DecisionStreamEvent[];
  status?: number;
};

export async function installMockDecisionTransport(
  page: Page,
  options: MockDecisionTransportOptions
) {
  await page.route(options.endpoint, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      body: encodeDecisionEventsAsNdjson(options.events),
      contentType: "application/x-ndjson; charset=utf-8",
      status: options.status ?? 200,
    });
  });
}
