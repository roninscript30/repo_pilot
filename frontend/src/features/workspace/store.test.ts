import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RepoActivity } from "@/features/repo/lib/activity";
import { tabsStorageKeys } from "./store";

const loginState = vi.hoisted(() => ({ login: null as string | null }));

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: {
    getState: () => ({ account: loginState.login !== null ? { login: loginState.login } : null }),
  },
}));

import { useWorkspaceStore } from "./store";
import { loadPreference, savePreference } from "@/services/user-preferences";

function repoTab(owner: string, name: string, activity = "overview") {
  return {
    kind: "repo" as const,
    owner,
    name,
    fullName: `${owner}/${name}`,
    activity: activity as RepoActivity,
  };
}

beforeEach(() => {
  localStorage.clear();
  loginState.login = null;
  useWorkspaceStore.setState({ tabs: [], activeTabId: null, recentlyClosed: [] });
});

describe("tabsStorageKeys", () => {
  it("scopes keys by login, falling back to the anonymous keys", () => {
    expect(tabsStorageKeys("octocat")).toEqual({
      tabsKey: "workspace.tabs.octocat",
      activeKey: "workspace.active-tab.octocat",
      recentKey: "workspace.recently-closed.octocat",
    });
    expect(tabsStorageKeys(null)).toEqual({
      tabsKey: "workspace.tabs",
      activeKey: "workspace.active-tab",
      recentKey: "workspace.recently-closed",
    });
  });
});

describe("useWorkspaceStore (per-account persistence)", () => {
  it("persists tabs under the active account's scoped keys", () => {
    loginState.login = "octocat";
    const store = useWorkspaceStore;
    store.getState().openTab(repoTab("acme", "one"));

    const persisted = loadPreference<unknown>("workspace.tabs.octocat", null);
    expect(persisted).toHaveLength(1);
    expect(loadPreference<unknown>("workspace.tabs", null)).toBeNull();
  });

  it("keeps accounts fully separated", () => {
    loginState.login = "octocat";
    const store = useWorkspaceStore;
    store.getState().openTab(repoTab("a", "one"));
    loginState.login = "hubot";
    store.getState().resetForAccount();
    store.getState().openTab(repoTab("b", "two"));

    expect(store.getState().tabs).toHaveLength(1);
    expect(store.getState().tabs[0]).toMatchObject({ fullName: "b/two" });

    loginState.login = "octocat";
    store.getState().resetForAccount();
    expect(store.getState().tabs).toHaveLength(1);
    expect(store.getState().tabs[0]).toMatchObject({ fullName: "a/one" });
  });

  it("falls back to the legacy anonymous keys when no scoped data exists", () => {
    savePreference("workspace.tabs", [repoTab("legacy", "repo")]);
    loginState.login = "octocat";
    const store = useWorkspaceStore;
    store.getState().resetForAccount();
    expect(store.getState().tabs).toHaveLength(1);
    expect(store.getState().tabs[0]).toMatchObject({ fullName: "legacy/repo" });
  });
});

describe("recentlyClosed", () => {
  it("records a closed repo tab, dedupes by full name, and clears", () => {
    loginState.login = "octocat";
    const store = useWorkspaceStore;
    store.getState().openTab(repoTab("a", "one"));
    store.getState().openTab(repoTab("b", "two"));
    store.getState().closeTab("repo:a/one");
    store.getState().closeTab("repo:b/two");
    store.getState().openTab(repoTab("a", "one"));
    store.getState().closeTab("repo:a/one");

    const recent = store.getState().recentlyClosed.map((tab) => tab.fullName);
    expect(recent).toEqual(["a/one", "b/two"]);

    store.getState().clearRecentlyClosed();
    expect(store.getState().recentlyClosed).toHaveLength(0);
  });

  it("reloads recently closed tabs for the active account", () => {
    loginState.login = "octocat";
    const store = useWorkspaceStore;
    store.getState().openTab(repoTab("a", "one"));
    store.getState().closeTab("repo:a/one");

    loginState.login = null;
    store.getState().resetForAccount();
    expect(store.getState().recentlyClosed).toHaveLength(0);

    loginState.login = "octocat";
    store.getState().resetForAccount();
    expect(store.getState().recentlyClosed.map((tab) => tab.fullName)).toEqual(["a/one"]);
  });
});
