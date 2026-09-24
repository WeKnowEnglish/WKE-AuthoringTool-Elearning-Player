import { expect, test } from "@playwright/test";

const progressKey = "wke:mystery-progress:v1:missing-ac-remote";

test.describe("mystery engine Phase 1", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key) => {
      const marker = "mystery-phase1-test-initialized";
      if (!window.sessionStorage.getItem(marker)) {
        window.localStorage.removeItem(key);
        window.sessionStorage.setItem(marker, "1");
      }
    }, progressKey);
    await page.goto("/pilots/mystery", { waitUntil: "domcontentloaded" });
  });

  test("collects evidence and restores the investigation after reload", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "The Missing A/C Remote" }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Use classroom observations")).toBeVisible();

    await page.getByRole("button", { name: "Begin investigation" }).click();
    await expect(
      page.getByAltText(/bright classroom with an A\/C unit/i),
    ).toBeVisible();
    await expect(page.getByText("No evidence yet")).toBeVisible();

    await page.getByRole("button", { name: "Inspect trash bin" }).click();
    await expect(
      page.getByRole("heading", { name: "Two Dead Batteries" }),
    ).toBeVisible();
    await expect(page.getByText("Clues 1/5")).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Two Dead Batteries" }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Clues 1/5")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Review trash bin" }),
    ).toBeVisible();
  });

  test("keeps the player inside a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Begin investigation" }).click();

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport);
    await expect(page.getByRole("navigation", { name: "Mystery stages" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Evidence tray" })).toBeVisible();
  });
});
