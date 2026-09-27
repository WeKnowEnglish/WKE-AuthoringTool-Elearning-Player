import { expect, test } from "@playwright/test";

const adultManagedMessage =
  "New student accounts are created with a teacher or parent. Ask them for your sign-in details.";

test.describe("portal access boundaries", () => {
  test("Primary student login does not offer public account creation", async ({ page }) => {
    await page.goto("/primary/login", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Primary student login" }),
    ).toBeVisible();
    await expect(page.getByText(adultManagedMessage)).toBeVisible();
    await expect(page.getByRole("button", { name: "I'm new" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("Secondary student login does not offer public account creation", async ({ page }) => {
    await page.goto("/secondary/login", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Secondary student login" }),
    ).toBeVisible();
    await expect(page.getByText(adultManagedMessage)).toBeVisible();
    await expect(page.getByRole("button", { name: "I'm new" })).toHaveCount(0);
  });

  test("Teacher login keeps the requested protected destination", async ({ page }) => {
    await page.goto("/teacher/login?next=/teacher/classes", {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL(/\/login\?.*portal=teacher/);
    await expect(page).toHaveURL(/next=%2Fteacher%2Fclasses/);
    await expect(page.getByRole("button", { name: "Teacher sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("Parent portal has a separate adult account entry point", async ({ page }) => {
    await page.goto("/parent/login", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Parent portal" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });
});
