import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("resume download and corner companion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download Aoun’s resume", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("Aoun_Abbas_Resume.pdf");
  const response = await page.request.get("/Aoun_Abbas_Resume.pdf");
  expect(response.ok()).toBeTruthy();
  expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await page.getByRole("button", { name: "Meet mini Aoun" }).click();
  await expect(page.getByText("Hey, I’m mini Aoun.")).toBeVisible();
  await page.screenshot({ path: "../docs/screenshots/resume-companion.png", animations: "disabled" });
  await page.getByRole("button", { name: "Hide Aoun companion" }).click();
  await expect(page.getByRole("button", { name: "Meet mini Aoun" })).toHaveCount(0);
  await page.getByRole("button", { name: "Show Aoun companion" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".companion-character img")).toHaveCSS("animation-name", "none");
  await page.setViewportSize({ width: 390, height: 844 });
  const companion = await page.locator(".companion").boundingBox();
  const composer = await page.locator(".composer").boundingBox();
  expect(companion!.y + companion!.height).toBeLessThanOrEqual(composer!.y);
});

test("chat streams, exposes evidence, persists, exports and deletes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Offline preview", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Explore my projects From/ }).click();
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".message.assistant")).toContainText("DataBuddy");
  await page.getByRole("button", { name: /reference sources/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Reference sources" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close sources" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("aounos-conversation.md");
  await page.reload();
  await page.locator(".history-title").first().click();
  await expect(page.locator(".message.assistant")).toContainText("DataBuddy");
  await page.locator(".history-item").hover();
  await page.getByRole("button", { name: /^Delete Tell/ }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator(".history-item")).toHaveCount(0);
});

test("mobile navigation and layouts fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: "../docs/screenshots/mobile-chat.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Selected projects" }).click();
  await expect(
    page.getByRole("heading", { name: "Ideas, made tangible." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../docs/screenshots/mobile-projects.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("stop leaves an explicitly incomplete answer and retry can finish", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Message AounOS" })
    .fill("Tell me about DataBuddy");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByRole("button", { name: "Stop response" }).click();
  await expect(
    page.getByText("Response stopped · This answer may be incomplete."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop response" }),
  ).not.toBeVisible({ timeout: 20000 });
  await expect(page.locator(".message.assistant")).toContainText("DataBuddy");
  await expect(page.locator(".message.user")).toHaveCount(1);
});

test("homepage and project views render without console errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "../docs/screenshots/desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await page.screenshot({
    path: "../docs/screenshots/dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "About Aoun", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Curiosity is the/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("network failure shows a recoverable error", async ({ page }) => {
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Temporarily unavailable" }),
    }),
  );
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Message AounOS" })
    .fill("Who is Aoun?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Temporarily unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
});

test("home and project views have no serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  for (const view of ["home", "Selected projects"]) {
    if (view !== "home") await page.getByRole("button", { name: view }).click();
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      ),
    ).toEqual([]);
  }
});
