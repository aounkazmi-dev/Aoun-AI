import { test, expect } from "@playwright/test";

const featured = [
  "AutoSalon",
  "Reel2Build",
  "DataBuddy",
  "AskOne",
  "News Classifier",
  "DueBee",
];

test("featured projects follow priority and use available public links", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Selected projects", exact: true })
    .click();
  await expect(page.locator(".project-card h2")).toHaveText(featured);
  const autosalon = page
    .locator(".project-card")
    .filter({
      has: page.getByRole("heading", { name: "AutoSalon", exact: true }),
    });
  await expect(autosalon.getByText("Private repository")).toBeVisible();
  await expect(autosalon.getByRole("link")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Reel2Build live demo" }),
  ).toHaveAttribute("href", "https://reel2build.onrender.com");
});

for (const project of ["AutoSalon", "Reel2Build"]) {
  test(`${project} exploration returns its published evidence`, async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Selected projects", exact: true })
      .click();
    const card = page
      .locator(".project-card")
      .filter({
        has: page.getByRole("heading", { name: project, exact: true }),
      });
    await card.getByRole("button", { name: "Explore with AounOS" }).click();
    await expect(
      page.getByRole("button", { name: "Stop response" }),
    ).not.toBeVisible({ timeout: 20000 });
    await expect(page.locator(".message.user")).toContainText(
      `Explain ${project}: architecture, implementation, and limitations.`,
    );
    await expect(page.locator(".message.assistant")).toContainText(project);
    await page.getByRole("button", { name: /reference sources/ }).click();
    await expect(
      page
        .getByRole("dialog", { name: "Reference sources" })
        .locator("summary strong")
        .filter({ hasText: `${project} —` }),
    ).toHaveCount(1);
  });
}

test("six project cards fit a narrow mobile screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Selected projects", exact: true })
    .click();
  await expect(page.locator(".project-card h2")).toHaveText(featured);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../tmp/projects-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});
