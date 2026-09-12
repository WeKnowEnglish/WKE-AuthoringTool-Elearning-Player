import { expect, test } from "@playwright/test";

const routes = [
  {
    label: "canonical",
    path: "/homework/browser-check",
    next: "/homework/browser-check",
  },
  {
    label: "Primary",
    path: "/primary/homework/browser-check",
    next: "/primary/homework/browser-check",
  },
  {
    label: "Secondary",
    path: "/secondary/homework/browser-check",
    next: "/secondary/homework/browser-check",
  },
] as const;

test.describe("student homework sign-in recovery", () => {
  for (const route of routes) {
    test(`${route.label} deep link preserves its safe local return path`, async ({
      page,
    }) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });

      const url = new URL(page.url());
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("portal")).toBe("student");
      expect(url.searchParams.get("next")).toBe(route.next);
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    });
  }

  test("Primary recovery remains usable at a narrow mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/primary/homework/mobile-check", {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL(/\/login\?.*portal=student/);
    const signIn = page.getByRole("button", { name: /sign in/i });
    await expect(signIn).toBeVisible();
    await signIn.focus();
    await expect(signIn).toBeFocused();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
