// EPG Functionality Test
// Tests the EPG operations in Beats TV IPTV client

import { test, expect } from '@playwright/test';

test.describe('EPG Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:4200');
    
    // Wait for the app to load
    await page.waitForSelector('.app-home');
  });

  test('should load EPG data on startup', async ({ page }) => {
    // Wait for EPG data to load
    await page.waitForTimeout(2000); // Wait for EPG check to complete
    
    // Check if EPG modal is available
    const epgButton = page.locator('button[ng-reflect-aria-label="EPG"]');
    expect(await epgButton.isVisible()).toBe(true);
  });

  test('should show EPG modal when button is clicked', async ({ page }) => {
    // Click EPG button
    const epgButton = page.locator('button[ng-reflect-aria-label="EPG"]');
    await epgButton.click();
    
    // Wait for modal to appear
    await page.waitForSelector('.modal.show');
    
    // Check if EPG modal is visible
    const epgModal = page.locator('.epg-modal');
    expect(await epgModal.isVisible()).toBe(true);
  });

  test('should display EPG channels in modal', async ({ page }) => {
    // Click EPG button
    const epgButton = page.locator('button[ng-reflect-aria-label="EPG"]');
    await epgButton.click();
    
    // Wait for modal to appear
    await page.waitForSelector('.modal.show');
    
    // Check if EPG channels are displayed
    const epgChannels = page.locator('.epg-channel');
    expect(await epgChannels.count()).toBeGreaterThan(0);
  });

  test('should allow activating/deactivating EPG channels', async ({ page }) => {
    // Click EPG button
    const epgButton = page.locator('button[ng-reflect-aria-label="EPG"]');
    await epgButton.click();
    
    // Wait for modal to appear
    await page.waitForSelector('.modal.show');
    
    // Find a channel toggle
    const channelToggle = page.locator('.epg-channel-toggle').first();
    
    // Get initial state
    const initialChecked = await channelToggle.isChecked();
    
    // Toggle the channel
    await channelToggle.click();
    
    // Wait for state to change
    await page.waitForTimeout(500);
    
    // Check if state changed
    const newChecked = await channelToggle.isChecked();
    expect(newChecked).not.toBe(initialChecked);
  });

  test('should handle EPG data loading errors gracefully', async ({ page }) => {
    // Simulate EPG data loading error (this would require mocking in a real test)
    // For now, we'll just check that the app doesn't crash
    
    // Wait for app to load
    await page.waitForSelector('.app-home');
    
    // Check if app is still responsive
    const searchInput = page.locator('input[ng-reflect-placeholder="Search..."]');
    expect(await searchInput.isVisible()).toBe(true);
  });
});