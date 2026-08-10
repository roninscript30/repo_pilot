import { expect, test } from "@playwright/test";

const GITHUB_USER = {
  login: "octocat",
  id: 1,
  name: "Mona Octocat",
  avatar_url: "https://avatars.githubusercontent.com/octocat",
  html_url: "https://github.com/octocat",
  type: "User",
};

/** Recent timestamp so the dashboard's 7-day activity filter includes this commit. */
const COMMIT_DATE = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const HELLO_WORLD_COMMIT = {
  sha: "c0ffee1234567890abcdef1234567890abcdef12",
  commit: {
    author: {
      name: "Mona Octocat",
      email: "octocat@github.com",
      date: COMMIT_DATE,
    },
    committer: {
      name: "Mona Octocat",
      email: "octocat@github.com",
      date: COMMIT_DATE,
    },
    message: "Update README",
  },
  html_url: "https://github.com/octocat/hello-world/commit/c0ffee",
  author: { login: "octocat", avatar_url: "https://avatars.githubusercontent.com/octocat" },
  committer: { login: "octocat", avatar_url: "https://avatars.githubusercontent.com/octocat" },
  parents: [{ sha: "beefcafe1234567890abcdef1234567890abcdef12" }],
};

/** Stub the dashboard's per-repo collaboration queries (used after sign-in). */
async function stubDashboardRoutes(page: Page): Promise<void> {
  await page.route("https://api.github.com/repos/octocat/hello-world/commits**", (route) =>
    route.fulfill({ status: 200, json: [HELLO_WORLD_COMMIT] }),
  );
  await page.route("https://api.github.com/repos/octocat/hello-world/pulls**", (route) =>
    route.fulfill({ status: 200, json: [] }),
  );
  await page.route("https://api.github.com/repos/octocat/hello-world/issues**", (route) =>
    route.fulfill({ status: 200, json: [] }),
  );
  await page.route("https://api.github.com/repos/octocat/hello-world/actions/runs**", (route) =>
    route.fulfill({ status: 200, json: { workflow_runs: [] } }),
  );
}

const HELLO_WORLD = {
  id: 42,
  full_name: "octocat/hello-world",
  owner: GITHUB_USER,
  name: "hello-world",
  description: "A test repo",
  html_url: "https://github.com/octocat/hello-world",
  private: false,
  default_branch: "main",
  language: "TypeScript",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  pushed_at: "2026-01-01T00:00:00Z",
  stargazers_count: 12,
  forks_count: 3,
  watchers_count: 3,
  open_issues_count: 1,
  archived: false,
  fork: false,
};

const ORGANIZATION = {
  login: "acme",
  id: 7,
  name: "Acme",
  description: "Widgets",
  avatar_url: "https://avatars.githubusercontent.com/acme",
  html_url: "https://github.com/acme",
  type: "Organization",
};

test.describe("onboarding (first run)", () => {
  test("boots to onboarding on first run", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Welcome to Repo Pilot" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in with GitHub" })).not.toBeVisible();
  });

  test("walks through onboarding with a valid token and lands on the dashboard", async ({ page }) => {
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
      route.fulfill({ status: 200, json: [HELLO_WORLD] }),
    );
    await page.route("https://api.github.com/user/orgs**", (route) =>
      route.fulfill({ status: 200, json: [ORGANIZATION] }),
    );
    await stubDashboardRoutes(page);

    await page.goto("/");
    await page.getByRole("button", { name: "Get started" }).click();
    await expect(page.getByRole("heading", { name: "One workspace for every repository" })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Connect a provider" })).toBeVisible();
    await page.getByRole("button", { name: /^GitHub/ }).click();
    await expect(page.getByRole("heading", { name: "Connect GitHub" })).toBeVisible();
    await expect(page.getByText(/held in memory only/)).toBeVisible();

    await page.getByPlaceholder("github_pat_...").fill("github_pat_valid");
    await page.getByRole("button", { name: "Validate and connect" }).click();

    await expect(page.getByRole("heading", { name: "Permission check" })).toBeVisible();
    await expect(page.getByText("Mona Octocat")).toBeVisible();
    await expect(page.getByText("Granted scopes")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Your workspace" })).toBeVisible();
    await expect(page.getByText("acme")).toBeVisible();
    await page.getByRole("button", { name: "Sync repositories" }).click();

    await expect(page.getByRole("heading", { name: "Building your workspace" })).toBeVisible();
    await page.getByRole("button", { name: "Open dashboard" }).click();

    await expect(page.getByRole("navigation", { name: "Global navigation" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: /Mona/ })).toBeVisible();
    await expect(page.getByText("octocat/hello-world")).toBeVisible();

    const preferences = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("repoPilot:preferences") ?? "{}"),
    );
    expect(preferences["onboarding-completed"]).toBe(true);
  });

  test("shows an error when GitHub rejects the token", async ({ page }) => {
    await page.route("https://api.github.com/user", (route) =>
      route.fulfill({ status: 401, json: { message: "Bad credentials" } }),
    );

    await page.goto("/");
    await page.getByRole("button", { name: "Get started" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /^GitHub/ }).click();
    await page.getByPlaceholder("github_pat_...").fill("github_pat_invalid");
    await page.getByRole("button", { name: "Validate and connect" }).click();

    await expect(page.getByText(/GitHub rejected this token/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Connect GitHub" })).toBeVisible();
  });
});

test.describe("sign in (returning users)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("repoPilot:preferences", JSON.stringify({ "onboarding-completed": true }));
    });
  });

  test("shows the classic sign-in page once onboarding is complete", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Sign in with GitHub" })).toBeVisible();
    await expect(page.getByText(/held in memory only/)).toBeVisible();

    const signIn = page.getByRole("button", { name: "Sign in" });
    await expect(signIn).toBeDisabled();
  });

  test("enables the submit button once a token is typed", async ({ page }) => {
    await page.goto("/");
    const signIn = page.getByRole("button", { name: "Sign in" });
    await page.getByPlaceholder("github_pat_...").fill("github_pat_123");
    await expect(signIn).toBeEnabled();
  });

  test("signs in with a valid token and lands on the dashboard", async ({ page }) => {
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
      route.fulfill({ status: 200, json: [HELLO_WORLD] }),
    );
    await stubDashboardRoutes(page);

    await page.goto("/");
    await page.getByPlaceholder("github_pat_...").fill("github_pat_valid");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("heading", { level: 1, name: /Mona/ })).toBeVisible();
    await expect(page.getByText("octocat/hello-world")).toBeVisible();
  });

  test("starts the GitHub device flow and shows the user code", async ({ page }) => {
    await page.route("https://github.com/login/device/code", (route) =>
      route.fulfill({
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        json: {
          device_code: "dc_123",
          user_code: "ABCD-EFGH",
          verification_uri: "https://github.com/login/device",
          expires_in: 900,
          interval: 5,
        },
      }),
    );
    await page.route("https://github.com/login/oauth/access_token", (route) =>
      route.fulfill({
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        json: { error: "authorization_pending" },
      }),
    );

    await page.goto("/");
    await page.getByRole("button", { name: "Continue with GitHub" }).click();

    await expect(page.getByText("Enter this code at")).toBeVisible();
    await expect(page.getByText("ABCD-EFGH")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
  });
});
