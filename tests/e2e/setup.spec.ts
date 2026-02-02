import { test, expect } from './base';

test.describe('Initial Setup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should land on setup page when no sources exist', async ({ page }) => {
    await expect(page.locator('h2')).toContainText("Let's add your first source");
  });

  test('should validate source name existence', async ({ page, setMockIpcOverride }) => {
    // Mock the backend to return true for "Existent Source"
    await setMockIpcOverride({
      source_name_exists: (args: any) => args.name === 'Existent Source',
    });

    const nameInput = page.getByPlaceholder('Nickname for this source');
    await nameInput.fill('Existent Source');
    await nameInput.blur();

    // Wait for the debounced validator (300ms)
    await page.waitForTimeout(500);

    await expect(page.locator('.text-danger:has-text("already taken")')).toBeVisible();
  });

  test('should select M3U URL mode and fill details', async ({ page }) => {
    await page.click('button:has-text("M3U URL")');

    await expect(page.getByPlaceholder('URL')).toBeVisible();

    await page.getByPlaceholder('Nickname for this source').fill('My Playlist');
    await page.getByPlaceholder('URL').fill('http://example.com/playlist.m3u');

    await expect(page.locator('button:has-text("Fetch")')).toBeEnabled();
  });

  test('should handle fetch errors gracefully', async ({ page, setMockIpcOverride }) => {
    await page.click('button:has-text("M3U URL")');

    // Mock fetch failure
    await setMockIpcOverride({
      get_m3u8_from_link: () => Promise.reject('Network error'),
    });

    await page.getByPlaceholder('Nickname for this source').fill('Error Playlist');
    await page.getByPlaceholder('URL').fill('http://bad-url.com');
    await page.click('button:has-text("Fetch")');

    // Wait for error toast (Broadening locator to find any toast)
    await expect(
      page.locator('.ngx-toastr, .toast-container, .modal-title:has-text("Error")').first(),
    ).toBeVisible();
  });
});
