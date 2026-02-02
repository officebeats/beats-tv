import { test, expect } from './base';

test.describe('Home Page and Channel Navigation', () => {
  const mockSources = [{ id: 1, name: 'Live Playlist', enabled: true, source_type: 0 }];

  test.beforeEach(async ({ page, setMockIpcOverride }) => {
    await setMockIpcOverride({
      get_sources: mockSources,
      get_settings: {
        default_view: 0,
        volume: 80,
        zoom: 100,
        enable_tray_icon: true,
      },
      search: ({ filters }: any) => {
        const generateChannels = (count: number) => {
          return Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            name: `Channel ${i + 1}`,
            media_type: i + 1 === 5 ? 2 : 1,
            source_id: 1,
            url: `http://stream.com/${i + 1}`,
            logo: 'https://via.placeholder.com/150',
            group_title: 'General',
            is_favorite: false,
            hidden: false,
          }));
        };

        const allChannels = generateChannels(100);
        if (filters.query && filters.query.length > 0) {
          return allChannels.filter((c) =>
            c.name.toLowerCase().includes(filters.query.toLowerCase()),
          );
        }
        const start = (filters.page - 1) * 36;
        return allChannels.slice(start, start + 36);
      },
    });

    await page.goto('/');
    await expect(page.locator('app-channel-tile').first()).toBeVisible({ timeout: 15000 });
  });

  test('should display channels and support infinite scroll', async ({ page }) => {
    await expect(page.locator('app-channel-tile')).toHaveCount(36);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('app-channel-tile')).toHaveCount(72, { timeout: 10000 });
  });

  test('should search for channels', async ({ page }) => {
    const searchInput = page.locator('app-header input[placeholder*="Search"]');
    await searchInput.click();
    await searchInput.fill('Channel 10');
    // Wait for the specific result - use a more specific count check
    await expect(page.locator('app-channel-tile')).toHaveCount(1, { timeout: 15000 });
    await expect(page.locator('app-channel-tile').first()).toContainText('Channel 10');
  });

  test('should handle "no results" with fallback search', async ({ page, setMockIpcOverride }) => {
    await setMockIpcOverride({
      search: ({ filters }: any) => {
        if (filters.query === 'NotFound') {
          if (filters.media_types && filters.media_types.length > 0) return [];
          return [{ id: 999, name: 'Fallback Match', media_type: 1 }];
        }
        return [];
      },
    });

    const searchInput = page.locator('app-header input[placeholder*="Search"]');
    await searchInput.fill('NotFound');

    // Increased timeout for fallback logic
    await expect(page.locator('app-channel-tile').first()).toContainText('Fallback Match', {
      timeout: 20000,
    });
    await expect(page.locator('.ngx-toastr, .toast-info, .toast-container').first()).toBeVisible();
  });

  test('should toggle selection mode and allow bulk selection', async ({ page }) => {
    await page.click('button[title*="Selection Mode"], .selection-toggle');

    // Wait for a visible indicator of selection mode if any, or just wait a bit longer
    await page.waitForTimeout(1000);

    // Click first tile
    await page.locator('app-channel-tile').first().click();

    // Check selection bar visibility with longer timeout
    const bar = page.locator('app-bulk-action-bar');
    await expect(bar).toBeVisible({ timeout: 10000 });
    await expect(page.locator('app-header')).toContainText('1');

    await page.locator('app-channel-tile').nth(1).click();
    await expect(page.locator('app-header')).toContainText('2');

    await page.click('button:has-text("Select All")');
    await expect(page.locator('app-header')).toContainText('36', { timeout: 10000 });
  });

  test('should open channel details modal', async ({ page }) => {
    const searchInput = page.locator('app-header input[placeholder*="Search"]');
    await searchInput.fill('Channel 5');
    await expect(page.locator('app-channel-tile')).toHaveCount(1, { timeout: 10000 });

    await page.locator('app-channel-tile').first().click();
    // Use a very high timeout for the first modal load
    await expect(page.locator('app-content-detail-modal')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('app-content-detail-modal').first()).toContainText('Channel 5');
  });
});
