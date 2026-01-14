import { test, expect } from "@playwright/test";

test.describe("Card Visual Responsiveness", () => {
  test("should render cards correctly on desktop", async ({ page }) => {
    await page.goto("/test-visuals/card-layout");

    // Wait for content to load
    await expect(page.locator("text=Card Layout Visual Test")).toBeVisible();

    // Take full page screenshot
    await expect(page).toHaveScreenshot("desktop-full.png", { fullPage: true });
  });

  test("should handle long content on mobile viewport (iPhone 12)", async ({
    page,
  }) => {
    // Set viewport to iPhone 12 size manually if not using project preset,
    // or just rely on the project preset if running with --project='Mobile Safari'
    // But here we explicitly set it to ensure specific width testing.
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/test-visuals/card-layout");
    await expect(page.locator("text=Card Layout Visual Test")).toBeVisible();

    // Take full page screenshot
    await expect(page).toHaveScreenshot("mobile-iphone12-full.png", {
      fullPage: true,
    });

    // Focus on the specific cards
    const longUrlCard = page.locator(".space-y-4").first(); // The first column
    await expect(longUrlCard).toBeVisible();
    await expect(longUrlCard).toHaveScreenshot("mobile-column-content.png");
  });

  test("should handle extreme constraints (320px)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/test-visuals/card-layout");
    await expect(page.locator("text=Card Layout Visual Test")).toBeVisible();

    await expect(page).toHaveScreenshot("mobile-320px-full.png", {
      fullPage: true,
    });
  });
});
