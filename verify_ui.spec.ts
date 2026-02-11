import { test, expect } from '@playwright/test';

test('Verify UI Layout Integration', async ({ page }) => {
  // Navigate to the built application
  await page.goto('http://localhost:8080');

  // Wait for the app to initialize
  await page.waitForSelector('app-root');

  // Check Sidebar visibility and dimensions
  const sidebar = page.locator('.sidebar');
  await expect(sidebar).toBeVisible();

  const sidebarBoundingBox = await sidebar.boundingBox();
  console.log(`Sidebar dimensions: ${sidebarBoundingBox?.width}x${sidebarBoundingBox?.height}`);

  // The sidebar should be narrow (around 90px) but full height
  expect(sidebarBoundingBox?.width).toBeGreaterThan(50);
  expect(sidebarBoundingBox?.width).toBeLessThan(150);

  // Check Logo dimensions (should be fixed height if styling is applied)
  const logo = page.locator('.sidebar-logo-persistent');
  await expect(logo).toBeVisible();
  const logoBox = await logo.boundingBox();
  console.log(`Logo height: ${logoBox?.height}`);

  // If styling failed, the logo would likely take its natural huge size or 0
  // Our CSS says: height: 48px
  expect(logoBox?.height).toBeCloseTo(48, 1);

  // Check Background color (Global style)
  const body = page.locator('body');
  const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);
  console.log(`Body background color: ${bgColor}`);
  expect(bgColor).toBe('rgb(0, 0, 0)');

  // Check if Navigation items are displayed as a list (Flex/Grid)
  const navItems = page.locator('.nav-item');
  const count = await navItems.count();
  console.log(`Nav items found: ${count}`);
  expect(count).toBeGreaterThan(0);
});
