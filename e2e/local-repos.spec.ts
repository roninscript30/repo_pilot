import { expect, test, type Page } from "@playwright/test";

const GITHUB_USER = {
  login: "octocat",
  id: 1,
  name: "Mona Octocat",
  avatar_url: "https://avatars.githubusercontent.com/octocat",
  html_url: "https://github.com/octocat",
  type: "User",
};

async function signIn(page: Page): Promise<void> {
  await page.route("https://api.github.com/user", (route) =>
    route.fulfill({
      status: 200,
      headers: {
        "x-oauth-scopes": "repo, read:org",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "x-oauth-scopes",
      },
      json: GITHUB_USER,
    }),
  );
  await page.route("https://api.github.com/user/repos**", (route) =>
    route.fulfill({ status: 200, json: [] }),
  );
  await page.route("https://api.github.com/user/orgs**", (route) =>
    route.fulfill({ status: 200, json: [] }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /^GitHub/ }).click();
  await page.getByPlaceholder("github_pat_...").fill("github_pat_valid");
  await page.getByRole("button", { name: "Validate and connect" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Sync repositories" }).click();
  await page.getByRole("button", { name: "Open dashboard" }).click();

  await expect(page.getByRole("navigation", { name: "Global navigation" })).toBeVisible();
}

test.describe("local repositories in browser preview", () => {
  test("reports that browser preview cannot open local repositories", async ({ page }) => {
    await signIn(page);
    await page.getByRole("link", { name: "Local Repos" }).click();

    await expect(page.getByRole("heading", { name: "Local Repositories" })).toBeVisible();
    await expect(page.getByText("web-fallback")).toBeVisible();

    await page.getByPlaceholder("/home/you/code/your-repo").fill("/tmp/some-repo");
    await page.getByRole("button", { name: "Open", exact: true }).click();

    await expect(page.getByRole("alert")).toContainText(
      "Browser preview cannot open local repositories. Use the desktop app.",
    );
  });

  test("asks for a path when none is entered", async ({ page }) => {
    await signIn(page);
    await page.getByRole("link", { name: "Local Repos" }).click();

    await page.getByRole("button", { name: "Open", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Enter a path");
  });

  test("reports that browser preview cannot clone repositories", async ({ page }) => {
    await signIn(page);
    await page.getByRole("link", { name: "Local Repos" }).click();

    await page.getByRole("button", { name: "Clone", exact: true }).click();
    await page.getByRole("dialog", { name: "Clone repository" }).waitFor();

    await page.getByLabel("Repository URL").fill("https://github.com/octocat/hello-world.git");
    await page.getByLabel("Destination folder").fill("/tmp");

    await page.getByTestId("clone-submit").click();
    await expect(page.getByRole("status")).toContainText("Clone failed");
    await expect(page.getByRole("status")).toContainText("desktop runtime");
  });
});
