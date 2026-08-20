import { expect, test } from "@playwright/test";

test.describe("Personal OS v1", () => {
  test("renders the shell and completes an evidence-backed Cortex ask", async ({
    page,
  }) => {
    await page.goto("/");

    const primaryNavigation = page.getByRole("navigation", {
      name: "Personal OS",
    });
    await expect(
      primaryNavigation.getByText("Today", { exact: true })
    ).toBeVisible();
    await expect(
      primaryNavigation.getByText("Goals", { exact: true })
    ).toBeVisible();
    await expect(
      primaryNavigation.getByText("Journal", { exact: true })
    ).toBeVisible();
    await expect(
      primaryNavigation.getByText("Principles", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Personal records" })
    ).toContainText("Decisions");

    await page.getByRole("link", { name: "Ask" }).click();
    await expect(page).toHaveURL(/\/ask$/);

    await page
      .getByLabel("Ask your Principles")
      .fill(
        "Should I run a reversible conflict-repair test before ending a partnership?"
      );
    await page.getByRole("button", { name: "Ask" }).click();

    await expect(page.getByText("Framing", { exact: true })).toBeVisible();
    await expect(page.getByText("Evidence", { exact: true })).toBeVisible();
    await expect(page.getByText("Confidence", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save as Decision" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Save as Decision" }).click();
    await expect(page).toHaveURL(/\/decisions\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Context" })).toBeVisible();

    const decisionId = new URL(page.url()).pathname.split("/").pop();
    expect(decisionId).toMatch(/^[0-9a-f-]{36}$/);
    const cleanup = await page
      .context()
      .request.delete(`/api/decisions/${decisionId}`);
    expect(cleanup.status()).toBe(204);
  });

  test("Cortex fails closed when retrieval returns no evidence", async ({
    request,
  }) => {
    const response = await request.post("/api/cortex", {
      data: { input: "NO_EVIDENCE_FIXTURE" },
    });
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      result?: { grounded?: boolean; evidence?: unknown[] };
      status?: string;
    };
    expect(body.status).toBe("complete");
    expect(body.result?.grounded).toBe(false);
    expect(body.result?.evidence).toEqual([]);
  });
});
