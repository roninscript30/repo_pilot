import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubProvider } from "./provider";
import type { GitHubApiClient } from "./api";

function stubClient(overrides: Partial<GitHubApiClient> = {}): GitHubApiClient {
  const base = {
    get: vi.fn().mockResolvedValue([]),
    request: vi.fn().mockResolvedValue({}),
  };
  return { ...base, ...overrides } as never;
}

describe("GitHubProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validateToken", () => {
    it("returns the account and scopes on success", async () => {
      const response = new Response(
        JSON.stringify({ login: "octocat", name: "Mona", avatar_url: "a.png", id: 1, html_url: "h" }),
        { status: 200, headers: { "x-oauth-scopes": "repo, read:org" } },
      );
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

      const provider = new GitHubProvider(stubClient());
      const validation = await provider.validateToken("ghp_x");

      expect(validation.scopes).toEqual(["repo", "read:org"]);
      expect(validation.account).toMatchObject({ login: "octocat", providerId: "github" });
    });

    it("rejects invalid tokens with a clear message", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
      const provider = new GitHubProvider(stubClient());
      await expect(provider.validateToken("bad")).rejects.toThrow(/invalid or expired/);
    });

    it("rejects unexpected statuses", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
      const provider = new GitHubProvider(stubClient());
      await expect(provider.validateToken("x")).rejects.toThrow(/HTTP 500/);
    });
  });

  describe("listRepositories", () => {
    it("requests /user/repos with a per-page limit", async () => {
      const client = stubClient();
      const provider = new GitHubProvider(client);
      await provider.listRepositories({});
      expect(client.get).toHaveBeenCalledWith("/user/repos", [["per_page", "30"]]);
    });

    it("adds a sort param when a query is present", async () => {
      const client = stubClient();
      const provider = new GitHubProvider(client);
      await provider.listRepositories({ query: "react" });
      expect(client.get).toHaveBeenCalledWith("/user/repos", [
        ["per_page", "30"],
        ["sort", "updated"],
      ]);
    });
  });

  describe("searchRepositories", () => {
    it("falls back to listRepositories for empty queries", async () => {
      const client = stubClient();
      const provider = new GitHubProvider(client);
      await provider.searchRepositories({});
      expect(client.get).toHaveBeenCalledWith("/user/repos", [["per_page", "30"]]);
    });

    it("searches /search/repositories with an in:name query", async () => {
      const client = stubClient({ get: vi.fn().mockResolvedValue({ items: [] }) });
      const provider = new GitHubProvider(client);
      await provider.searchRepositories({ query: "pilot" });
      expect(client.get).toHaveBeenCalledWith("/search/repositories", [
        ["q", "pilot in:name"],
        ["per_page", "30"],
      ]);
    });
  });

  describe("compareBranches", () => {
    it.each([
      [{ ahead_by: 0, behind_by: 0 }, "identical"],
      [{ ahead_by: 3, behind_by: 0 }, "ahead"],
      [{ ahead_by: 0, behind_by: 2 }, "behind"],
      [{ ahead_by: 3, behind_by: 2 }, "diverged"],
    ] as const)("maps %o to '%s'", async (raw, expected) => {
      const client = stubClient({ get: vi.fn().mockResolvedValue({ ...raw, status: "x" }) });
      const provider = new GitHubProvider(client);
      const result = await provider.compareBranches("octocat/hello", "main", "dev");
      expect(result).toMatchObject({ base: "main", head: "dev", aheadBy: raw.ahead_by, behindBy: raw.behind_by, status: expected });
      expect(client.get).toHaveBeenCalledWith("/repos/octocat/hello/compare/main...dev");
    });
  });

  describe("listIssues", () => {
    it("filters out pull requests from /issues", async () => {
      const client = stubClient({
        get: vi.fn().mockResolvedValue([
          { id: 1, number: 1, title: "Real issue", state: "open", user: {}, created_at: "", updated_at: "", closed_at: null },
          { id: 2, number: 2, title: "PR entry", state: "open", user: {}, pull_request: { url: "x" }, created_at: "", updated_at: "", closed_at: null },
        ]),
      });
      const provider = new GitHubProvider(client);
      const issues = await provider.listIssues("octocat/hello", {});
      expect(issues.map((issue) => issue.number)).toEqual([1]);
    });
  });

  describe("getReadme", () => {
    it("decodes base64 content", async () => {
      const content = btoa("# Hello\n");
      const client = stubClient({
        get: vi.fn().mockResolvedValue({ content, encoding: "base64" }),
      });
      const provider = new GitHubProvider(client);
      await expect(provider.getReadme("octocat/hello")).resolves.toBe("# Hello\n");
      expect(client.get).toHaveBeenCalledWith("/repos/octocat/hello/contents/README.md");
    });

    it("returns null when no README candidate exists", async () => {
      const client = stubClient({ get: vi.fn().mockRejectedValue(new Error("404")) });
      const provider = new GitHubProvider(client);
      await expect(provider.getReadme("octocat/hello")).resolves.toBeNull();
    });
  });

  describe("getLanguages", () => {
    it("maps the languages object into a Map", async () => {
      const client = stubClient({ get: vi.fn().mockResolvedValue({ TypeScript: 800, Rust: 200 }) });
      const provider = new GitHubProvider(client);
      const langs = await provider.getLanguages("octocat/hello");
      expect(langs.get("TypeScript")).toBe(800);
      expect(langs.get("Rust")).toBe(200);
    });
  });
});

function rawPullRequest(number: number, state = "open"): Record<string, unknown> {
  return {
    id: number,
    number,
    title: "PR",
    state,
    html_url: "https://github.com/octocat/hello/pull/" + number,
    draft: false,
    merged_at: null,
    closed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    user: { login: "octocat", avatar_url: null },
    base: { ref: "main" },
    head: { ref: "fix" },
    additions: 1,
    deletions: 0,
    changed_files: 1,
    mergeable: true,
    review_decision: "none",
  };
}

describe("provider mutations", () => {
  it("createPullRequest posts to /pulls with base/head/title", async () => {
    const client = stubClient({ request: vi.fn().mockResolvedValue(rawPullRequest(7)) });
    const provider = new GitHubProvider(client);
    await provider.createPullRequest("octocat/hello", {
      title: "Fix bug",
      base: "main",
      head: "fix/bug",
      body: "Closes #1",
    });
    expect(client.request).toHaveBeenCalledWith(
      { method: "POST", body: { title: "Fix bug", base: "main", head: "fix/bug", body: "Closes #1" } },
      "/repos/octocat/hello/pulls",
    );
  });

  it("updatePullRequest patches title and state only when provided", async () => {
    const client = stubClient({ request: vi.fn().mockResolvedValue(rawPullRequest(7, "closed")) });
    const provider = new GitHubProvider(client);
    await provider.updatePullRequest("octocat/hello", 7, { state: "closed" });
    expect(client.request).toHaveBeenCalledWith(
      { method: "PATCH", body: { state: "closed" } },
      "/repos/octocat/hello/pulls/7",
    );
  });

  it("mergePullRequest PUTs the merge method and refetches the PR", async () => {
    const client = stubClient({
      request: vi.fn().mockResolvedValue({ merged: true }),
      get: vi.fn().mockResolvedValue(rawPullRequest(7, "closed")),
    });
    const provider = new GitHubProvider(client);
    const pull = await provider.mergePullRequest("octocat/hello", 7, { method: "squash" });
    expect(client.request).toHaveBeenCalledWith(
      { method: "PUT", body: { merge_method: "squash" } },
      "/repos/octocat/hello/pulls/7/merge",
    );
    expect(pull.number).toBe(7);
  });

  it("submitPullRequestReview maps events to GitHub values", async () => {
    const client = stubClient({
      request: vi.fn().mockResolvedValue({
        id: 1,
        user: { login: "octocat", avatar_url: null },
        state: "APPROVED",
        body: null,
        submitted_at: null,
      }),
    });
    const provider = new GitHubProvider(client);
    const review = await provider.submitPullRequestReview("octocat/hello", 7, { event: "approve", body: "LGTM" });
    expect(client.request).toHaveBeenCalledWith(
      { method: "POST", body: { event: "APPROVE", body: "LGTM" } },
      "/repos/octocat/hello/pulls/7/reviews",
    );
    expect(review.state).toBe("approved");
  });

  it("addIssueComment posts to the issues comments endpoint", async () => {
    const client = stubClient({ request: vi.fn().mockResolvedValue({ id: 1, body: "hi", user: { login: "octocat", avatar_url: null }, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }) });
    const provider = new GitHubProvider(client);
    await provider.addIssueComment("octocat/hello", 7, "hello world");
    expect(client.request).toHaveBeenCalledWith(
      { method: "POST", body: { body: "hello world" } },
      "/repos/octocat/hello/issues/7/comments",
    );
  });

  it("updateIssue patches only provided fields", async () => {
    const client = stubClient({ request: vi.fn().mockResolvedValue(rawPullRequest(5, "closed")) });
    const provider = new GitHubProvider(client);
    await provider.updateIssue("octocat/hello", 5, { state: "closed" });
    expect(client.request).toHaveBeenCalledWith(
      { method: "PATCH", body: { state: "closed" } },
      "/repos/octocat/hello/issues/5",
    );
  });

  it("setIssueLabels PUTs the full label list", async () => {
    const client = stubClient({
      request: vi.fn().mockResolvedValue([
        { name: "bug", color: "d73a4a" },
        { name: "docs", color: "0075ca" },
      ]),
    });
    const provider = new GitHubProvider(client);
    const labels = await provider.setIssueLabels("octocat/hello", 5, ["bug", "docs"]);
    expect(client.request).toHaveBeenCalledWith(
      { method: "PUT", body: { labels: ["bug", "docs"] } },
      "/repos/octocat/hello/issues/5/labels",
    );
    expect(labels).toEqual([
      { name: "bug", color: "d73a4a" },
      { name: "docs", color: "0075ca" },
    ]);
  });
});
