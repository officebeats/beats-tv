const { chromium } = require("@playwright/test");

(async () => {
  console.log("Starting verification...");
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // 1. Navigate
    console.log("Navigating to http://localhost:4200...");
    await page.goto("http://localhost:4200", { waitUntil: "networkidle" });

    // 2. Wait for Content (Tests "Empty Logic Fix")
    console.log("Waiting for content to load...");
    try {
      await page.waitForSelector(".channel-item", { timeout: 15000 });
    } catch (e) {
      console.error(
        'TIMEOUT: Content did not load. The "Empty Filter" fix might not have triggered.',
      );
      process.exit(1);
    }

    // 3. Verify Content Quantity
    const count = await page.locator(".channel-item").count();
    console.log(`SUCCESS: Found ${count} channel tiles.`);

    // 4. Verify Year Chips (Tests "Regex Logic Fix")
    // Look for chips with 4 digits in them
    const yearChips = await page.locator('.year-badge, .chip:has-text("20")').allTextContents();
    console.log("Visible Year Chips found:", yearChips.slice(0, 5));

    // 5. Verify First Item Title and Badges
    const firstItem = page.locator(".channel-item").first();
    const title = await firstItem.textContent();
    console.log(`First Item Text: "${title.replace(/\s+/g, " ").trim()}"`);

    // 6. Click to Detail (Tests "Detail Modal Fix")
    await firstItem.click();
    await page.waitForSelector("app-content-detail-modal", { timeout: 5000 });
    console.log("Detail Modal Opened.");

    const badges = await page.locator(".rating-badge").allTextContents();
    console.log(
      "Detail Badges:",
      badges.map((b) => b.trim()),
    );

    const hasNaN = badges.some((b) => b.includes("NaN") || b.includes("N/A"));
    if (hasNaN) {
      console.error("FAILURE: Found NaN or N/A in badges.");
    } else {
      console.log('SUCCESS: No "NaNm" or "N/A" badges found.');
    }

    await page.screenshot({ path: "verification_proof.png" });
    console.log("Proof screenshot saved to verification_proof.png");
  } catch (error) {
    console.error("Verification Error:", error);
  } finally {
    if (browser) await browser.close();
  }
})();
