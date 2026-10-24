import { test, expect } from "@playwright/test";

for (const width of [320, 360, 430, 768, 1024]) {
  test(`navigation and chat fit ${width}px screens`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await fits();
    if (width <= 700) await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("link", { name: "Download Aoun’s resume", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Selected projects", exact: true }).click();
    await fits();
    if (width <= 700) await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("button", { name: "About Aoun", exact: true }).click();
    await fits();
    if (width <= 700) await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("button", { name: "Ask AounOS", exact: true }).click();
    await page.getByRole("textbox", { name: "Message AounOS" }).fill("Tell me about DataBuddy");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible({ timeout: 20000 });
    await fits();
    await page.getByRole("button", { name: /reference sources/ }).click();
    await expect(page.getByRole("dialog", { name: "Reference sources" })).toBeVisible();
    await fits();
    await page.getByRole("button", { name: "Close sources" }).click();
    if (width === 360) await page.screenshot({ path: "../docs/screenshots/mobile-conversation.png", animations: "disabled" });
  });
}
