import { beforeEach, describe, expect, it } from "vitest";
import {
  mapAccount,
  mapActivityEvent,
  mapBranch,
  mapCommit,
  mapContributor,
  mapIssue,
  mapPullRequest,
  mapRelease,
  mapRepository,
} from "./mappers";
import type { GitHubUser } from "./types";

const user: GitHubUser = {
  login: "octocat",
  id: 1,
  name: "Mona Octocat",
  avatar_url: "https://avatars.example/octocat.png",
  html_url: "https://github.com/octocat",
  type: "User",
};

const repoPayload = {
  id: 42,
  name: "hello-world",
  full_name: "octocat/hello-world",
  owner: user,
  description: "A test repo",
  html_url: "https://github.com/octocat/hello-world",
  private: false,
  default_branch: "main",
  language: "TypeScript",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  pushed_at: "2026-01-01T00:00:00Z",
  stargazers_count: 1200,
  forks_count: 45,
  watchers_count: 45,
  open_issues_count: 3,
};

describe("mapAccount", () => {
  it("maps a GitHub user with its display name fallback", () => {
    const account = mapAccount(user, ["repo", "read:org"]);
    expect(account).toMatchObject({
      providerId: "github",
      login: "octocat",
      displayName: "Mona Octocat",
      avatarUrl: user.avatar_url,
      scopes: ["repo", "read:org"],
    });
    expect(account.createdAt).toBeTruthy();
  });

  it("falls back to login when name is missing", () => {
    const account = mapAccount({ ...user, name: null }, []);
    expect(account.displayName).toBe("octocat");
  });
});

describe("mapRepository", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("maps the GitHub payload to the domain model", () => {
    const repo = mapRepository(repoPayload as never);
    expect(repo).toMatchObject({
      id: "42",
      providerId: "github",
      fullName: "octocat/hello-world",
      name: "hello-world",
      description: "A test repo",
      isPrivate: false,
      isPinned: false,
      defaultBranch: "main",
      language: "TypeScript",
      stars: 1200,
      forks: 45,
      ownerType: "user",
    });
    expect(repo.owner).toEqual({ login: "octocat", avatarUrl: user.avatar_url });
  });

  it("marks repositories pinned in the pins store", () => {
    localStorage.setItem(
      "repoPilot.pinnedRepositories",
      JSON.stringify(["octocat/hello-world"]),
    );
    expect(mapRepository(repoPayload as never).isPinned).toBe(true);
  });
});

describe("mapCommit", () => {
  it("maps message, subject and author with login linkage", () => {
    const commit = mapCommit({
      sha: "abc123def456",
      commit: {
        message: "Fix the thing\n\nMore details here.",
        author: { name: "Mona Octocat", email: "mona@example.com", date: "2026-08-01T10:00:00Z" },
      },
      author: user,
    } as never);
    expect(commit).toMatchObject({
      sha: "abc123def456",
      shortSha: "abc123d",
      message: "Fix the thing\n\nMore details here.",
      subject: "Fix the thing",
      committedAt: "2026-08-01T10:00:00Z",
    });
    expect(commit.author).toMatchObject({
      name: "Mona Octocat",
      email: "mona@example.com",
      login: "octocat",
      avatarUrl: user.avatar_url,
    });
  });

  it("falls back to the login when the commit author is anonymous", () => {
    const commit = mapCommit({
      sha: "xyz",
      commit: { message: "X", author: null },
      author: user,
    } as never);
    expect(commit.author.name).toBe("octocat");
  });
});

describe("mapIssue", () => {
  it("maps labels, assignees and milestone", () => {
    const issue = mapIssue({
      id: 7,
      number: 12,
      title: "Bug: crash on startup",
      body: "Details",
      state: "open",
      html_url: "https://github.com/octocat/hello-world/issues/12",
      user,
      assignees: [user],
      labels: [{ name: "bug", color: "d73a4a" }],
      milestone: { title: "v1.0", state: "open", due_on: "2026-12-01" },
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-02T00:00:00Z",
      closed_at: null,
    } as never);
    expect(issue).toMatchObject({
      id: "7",
      number: 12,
      state: "open",
      labels: [{ name: "bug", color: "d73a4a" }],
      milestone: { title: "v1.0", state: "open", dueOn: "2026-12-01" },
    });
    expect(issue.author.login).toBe("octocat");
  });
});

describe("mapPullRequest", () => {
  const base = {
    id: 99,
    number: 5,
    title: "Add feature",
    body: "Body",
    state: "open",
    html_url: "https://github.com/octocat/hello-world/pull/5",
    draft: false,
    user,
    base: { ref: "main" },
    head: { ref: "feature/x" },
    merged_at: null,
    closed_at: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-02T00:00:00Z",
    additions: 10,
    deletions: 2,
    changed_files: 3,
  };

  it("maps an open PR as 'open'", () => {
    expect(mapPullRequest(base as never).state).toBe("open");
  });

  it("maps a closed PR with a merge date as 'merged'", () => {
    const pull = mapPullRequest({ ...base, state: "closed", merged_at: "2026-06-03T00:00:00Z" } as never);
    expect(pull.state).toBe("merged");
    expect(pull.isMerged).toBe(true);
  });

  it("maps a closed PR without a merge date as 'closed'", () => {
    const pull = mapPullRequest({ ...base, state: "closed" } as never);
    expect(pull.state).toBe("closed");
    expect(pull.isMerged).toBe(false);
  });
});

describe("mapRelease", () => {
  it("maps release metadata", () => {
    const release = mapRelease({
      id: 1,
      tag_name: "v1.2.3",
      name: "v1.2.3",
      body: "Notes",
      html_url: "https://github.com/octocat/hello-world/releases/tag/v1.2.3",
      draft: false,
      prerelease: false,
      author: user,
      published_at: "2026-05-01T00:00:00Z",
      created_at: "2026-05-01T00:00:00Z",
    } as never);
    expect(release).toMatchObject({
      id: "1",
      tagName: "v1.2.3",
      isDraft: false,
      isPrerelease: false,
      publishedAt: "2026-05-01T00:00:00Z",
    });
  });
});

describe("mapBranch and mapContributor", () => {
  it("maps a branch with a shortened latest commit sha", () => {
    const branch = mapBranch({
      name: "main",
      protected: true,
      commit: { sha: "abcdef0123456789" },
    } as never);
    expect(branch).toMatchObject({ name: "main", isProtected: true });
    expect(branch.latestCommit?.shortSha).toBe("abcdef0");
  });

  it("maps a branch without a commit to null latest commit", () => {
    const branch = mapBranch({ name: "orphan", protected: false, commit: null } as never);
    expect(branch.latestCommit).toBeNull();
  });

  it("maps contributors", () => {
    const contributor = mapContributor(user);
    expect(contributor).toEqual({
      login: "octocat",
      avatarUrl: user.avatar_url,
      contributions: 0,
    });
  });
});

describe("mapActivityEvent", () => {
  function event(overrides: Record<string, unknown>) {
    return {
      id: 1,
      type: "PushEvent",
      actor: { login: "octocat", avatar_url: null },
      created_at: "2026-08-01T00:00:00Z",
      payload: {},
      ...overrides,
    } as never;
  }

  it("summarizes pushes with branch and commit count", () => {
    const mapped = mapActivityEvent(event({ payload: { ref: "refs/heads/main", size: 4 } }));
    expect(mapped.kind).toBe("push");
    expect(mapped.description).toBe("Pushed 4 commits to main");
    expect(mapped.actor.login).toBe("octocat");
    expect(mapped.createdAt).toBe("2026-08-01T00:00:00Z");
  });

  it("maps single-commit pushes with singular wording", () => {
    const mapped = mapActivityEvent(event({ payload: { ref: "refs/heads/fix", size: 1 } }));
    expect(mapped.description).toBe("Pushed 1 commit to fix");
  });

  it("maps pull request events with title and url", () => {
    const mapped = mapActivityEvent(
      event({
        type: "PullRequestEvent",
        payload: {
          action: "opened",
          pull_request: { number: 12, title: "Fix the thing", html_url: "https://github.com/a/b/pull/12" },
        },
      }),
    );
    expect(mapped.kind).toBe("pull_request");
    expect(mapped.description).toBe("Pull request opened #12 — Fix the thing");
    expect(mapped.url).toBe("https://github.com/a/b/pull/12");
  });

  it("maps issue and label events", () => {
    const issue = mapActivityEvent(
      event({
        type: "IssuesEvent",
        payload: { action: "closed", issue: { number: 7, title: "Bug" } },
      }),
    );
    expect(issue.kind).toBe("issue");
    expect(issue.description).toBe("Issue closed #7 — Bug");
  });

  it("maps releases with tag or name", () => {
    const mapped = mapActivityEvent(
      event({ type: "ReleaseEvent", payload: { release: { tag_name: "v1.0.0", html_url: "https://r" } } }),
    );
    expect(mapped.kind).toBe("release");
    expect(mapped.description).toBe("Released v1.0.0");
  });

  it("maps watch events to stars", () => {
    const mapped = mapActivityEvent(event({ type: "WatchEvent" }));
    expect(mapped.kind).toBe("watch");
    expect(mapped.description).toBe("Starred the repository");
  });

  it("falls back to a description for unknown events", () => {
    const mapped = mapActivityEvent(event({ type: "MemberEvent" }));
    expect(mapped.kind).toBe("other");
    expect(mapped.description).toBe("Member event");
  });

  it("handles a missing actor", () => {
    const mapped = mapActivityEvent(event({ actor: null }));
    expect(mapped.actor.login).toBe("unknown");
  });
});
