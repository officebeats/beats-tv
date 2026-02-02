import { test as base } from '@playwright/test';
import { TAURI_MOCK_SCRIPT } from './mocks/tauri-mock';

/**
 * Custom Playwright test fixture that injects the Tauri Mock
 * into every page before it is created.
 */
export const test = base.extend<{
  setMockIpcOverride: (overrides: Record<string, any>) => Promise<void>;
}>({
  page: async ({ page }, use) => {
    // Inject the basic mock script
    await page.addInitScript(TAURI_MOCK_SCRIPT);
    await use(page);
  },

  setMockIpcOverride: async ({ page }, use) => {
    await use(async (overrides: Record<string, any>) => {
      const serializedOverrides: Record<string, any> = {};

      for (const [key, value] of Object.entries(overrides)) {
        if (typeof value === 'function') {
          serializedOverrides[key] = {
            __type: 'function',
            source: value.toString(),
          };
        } else {
          serializedOverrides[key] = {
            __type: 'value',
            value: value,
          };
        }
      }

      // Add as an init script so it persists across reloads and is available before page scripts
      await page.addInitScript((ovs) => {
        if (!(window as any).MOCK_IPC_OVERRIDE) (window as any).MOCK_IPC_OVERRIDE = {};

        for (const [key, wrapper] of Object.entries(ovs as any)) {
          const w = wrapper as any;
          if (w.__type === 'function') {
            try {
              // eslint-disable-next-line no-eval
              (window as any).MOCK_IPC_OVERRIDE[key] = eval(`(${w.source})`);
            } catch (e) {
              console.error('Failed to eval mock function for', key, e);
            }
          } else {
            (window as any).MOCK_IPC_OVERRIDE[key] = () => Promise.resolve(w.value);
          }
        }
      }, serializedOverrides);

      // Also evaluate immediately in case the page is already loaded
      await page
        .evaluate((ovs) => {
          if (!(window as any).MOCK_IPC_OVERRIDE) (window as any).MOCK_IPC_OVERRIDE = {};
          for (const [key, wrapper] of Object.entries(ovs as any)) {
            const w = wrapper as any;
            if (w.__type === 'function') {
              try {
                // eslint-disable-next-line no-eval
                (window as any).MOCK_IPC_OVERRIDE[key] = eval(`(${w.source})`);
              } catch (e) {
                /* ignore */
              }
            } else {
              (window as any).MOCK_IPC_OVERRIDE[key] = () => Promise.resolve(w.value);
            }
          }
        }, serializedOverrides)
        .catch(() => {}); // Ignore errors if page not loaded
    });
  },
});

export { expect } from '@playwright/test';
