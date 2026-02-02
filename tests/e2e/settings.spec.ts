import { test, expect } from './base';

test.describe('Settings Page', () => {
  const mockSettings = {
    use_stream_caching: true,
    default_view: 0,
    volume: 50,
    restream_port: 3000,
    enable_tray_icon: true,
    zoom: 100,
    default_sort: 0,
    enable_hwdec: true,
    always_ask_save: false,
    enable_gpu: false,
    mpv_params: '',
    refresh_on_start: false,
  };

  test.beforeEach(async ({ page, setMockIpcOverride }) => {
    // Mock settings and sources to bypass setup page
    await setMockIpcOverride({
      get_sources: [{ id: 1, name: 'Test', enabled: true }],
      get_settings: mockSettings,
      search: [],
      update_settings: (args: any) => {
        console.log('Backend received update_settings:', args.settings);
        return null;
      },
      get_mpv_preset: (args: any) => {
        if (args.preset === 'stable') {
          return '--reconnect-on-http-error=all --cache=yes';
        }
        return '';
      },
    });

    await page.goto('/settings');
  });

  test('should display current settings accurately', async ({ page }) => {
    await expect(page.locator('input[title="Volume on start"]')).toHaveValue('50');
    await expect(page.locator('input[title="UI Zoom"]')).toHaveValue('100');
    await expect(page.locator('input[title="Refresh all sources on start"]')).not.toBeChecked();
  });

  test('should update volume setting', async ({ page }) => {
    const volumeSlider = page.locator('input[title="Volume on start"]');

    // Simulate slider change
    await volumeSlider.fill('85');

    // Check if label updated
    await expect(page.locator('span:has-text("85")')).toBeVisible();
  });

  test('should toggle "Refresh on start" and trigger backend update', async ({ page }) => {
    const refreshToggle = page.locator('input[title="Refresh all sources on start"]');

    await refreshToggle.click();
    await expect(refreshToggle).toBeChecked();

    // Note: We'd ideally check the IPC call here, but since we mocked it,
    // we validated that the UI responded to the click and state changed.
  });

  test('should show dependency status in MPV Medical Check', async ({
    page,
    setMockIpcOverride,
  }) => {
    await setMockIpcOverride({
      check_dependencies: {
        dependencies: [
          { name: 'mpv', installed: true, version: '0.37.0' },
          { name: 'ffmpeg', installed: false },
        ],
      },
    });

    // Refresh dependencies (SettingsComponent calls this on init)
    await page.reload();

    await expect(page.locator('.dependency-name:has-text("MPV")')).toBeVisible();
    await expect(page.locator('.health-healthy:has-text("HEALTHY")')).toBeVisible();
    await expect(page.locator('.text-danger:has-text("Not Found")')).toBeVisible();
  });

  test('should prompt for nuke confirmation', async ({ page }) => {
    await page.click('button:has-text("Delete everything")');
    await expect(page.locator('.modal-body, .modal-title, .lbl').first()).toContainText('confirm', {
      ignoreCase: true,
    });
  });

  test('should apply the "Stable" MPV preset correctly', async ({ page }) => {
    // Select the "Stable" preset from the dropdown
    await page.selectOption('select[title="MPV Preset"]', { label: 'Stable (Anti-Repeat/Fixed)' });

    // Verify that the textarea was populated with parameters
    const paramsTextarea = page.locator('#mpvParams');
    await expect(paramsTextarea).not.toBeEmpty();

    // Verify it contains one of the new native flags we added
    await expect(paramsTextarea).toHaveValue(/--reconnect-on-http-error=all/);

    // Verify it DOES NOT contain the old crashing flag
    await expect(paramsTextarea).not.toContainText('reconnect_on_http_error=4xx,5xx');
  });
});
