import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalReposStore } from "@/features/local/store";

const PREFERENCES_KEY = "repoPilot:preferences";

function storedRepositories(): unknown {
  const raw = localStorage.getItem(PREFERENCES_KEY);
  if (!raw) return null;
  const preferences = JSON.parse(raw) as Record<string, unknown>;
  return preferences["local.repositories"];
}

beforeEach(() => {
  localStorage.clear();
  // Start each test with an empty tracked list (actions are preserved).
  useLocalReposStore.setState({ repositories: [] });
});

describe("local repository store", () => {
  it("tracks a path with an empty per-remote account map", () => {
    const entry = useLocalReposStore.getState().add("/work/repo");
    expect(entry.accountLogins).toEqual({});
    expect(useLocalReposStore.getState().repositories[0]?.accountLogins).toEqual({});
  });

  it("remembers which account authenticates a remote", () => {
    useLocalReposStore.getState().add("/work/repo");
    useLocalReposStore.getState().setAccountLogin("/work/repo", "origin", "octocat");
    const entry = useLocalReposStore.getState().repositories.find((repo) => repo.path === "/work/repo");
    expect(entry?.accountLogins).toEqual({ origin: "octocat" });
  });

  it("keeps other remotes' accounts when a new one is set", () => {
    useLocalReposStore.getState().add("/work/repo");
    useLocalReposStore.getState().setAccountLogin("/work/repo", "origin", "octocat");
    useLocalReposStore.getState().setAccountLogin("/work/repo", "upstream", "hubot");
    const entry = useLocalReposStore.getState().repositories.find((repo) => repo.path === "/work/repo");
    expect(entry?.accountLogins).toEqual({ origin: "octocat", upstream: "hubot" });
  });

  it("clears a remote's account by storing an empty login", () => {
    useLocalReposStore.getState().add("/work/repo");
    useLocalReposStore.getState().setAccountLogin("/work/repo", "origin", "octocat");
    useLocalReposStore.getState().setAccountLogin("/work/repo", "origin", "");
    const entry = useLocalReposStore.getState().repositories.find((repo) => repo.path === "/work/repo");
    expect(entry?.accountLogins).toEqual({ origin: "" });
  });

  it("persists per-remote account maps alongside the tracked paths", () => {
    useLocalReposStore.getState().add("/work/repo");
    useLocalReposStore.getState().setAccountLogin("/work/repo", "origin", "octocat");
    const persisted = storedRepositories() as Array<Record<string, unknown>>;
    expect(persisted[0]?.accountLogins).toEqual({ origin: "octocat" });
  });

  it("normalizes entries that predate per-remote account maps", async () => {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        "local.repositories": [
          {
            path: "/work/repo",
            fullName: null,
            pinned: false,
            addedAt: "2026-08-01T00:00:00Z",
            lastOpenedAt: "2026-08-01T00:00:00Z",
          },
        ],
      }),
    );
    vi.resetModules();
    const { useLocalReposStore: freshStore } = await import("@/features/local/store");
    const entry = freshStore.getState().repositories[0];
    expect(entry?.accountLogins).toEqual({});
  });
});
