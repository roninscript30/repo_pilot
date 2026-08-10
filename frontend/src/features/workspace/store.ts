import { create } from "zustand";
import { loadPreference, savePreference } from "@/services/user-preferences";
import { useAuthStore } from "@/stores/auth-store";
import {
  isSingletonKind,
  nextActiveTabId,
  tabId,
  type RepoWorkspaceTab,
  type WorkspaceTab,
} from "./lib/tabs";

const TABS_KEY = "workspace.tabs";
const ACTIVE_KEY = "workspace.active-tab";
const RECENT_KEY = "workspace.recently-closed";

/** Preference keys scoped to one account (tabs are per-account). */
export function tabsStorageKeys(login: string | null): {
  readonly tabsKey: string;
  readonly activeKey: string;
  readonly recentKey: string;
} {
  return login
    ? {
        tabsKey: `${TABS_KEY}.${login}`,
        activeKey: `${ACTIVE_KEY}.${login}`,
        recentKey: `${RECENT_KEY}.${login}`,
      }
    : { tabsKey: TABS_KEY, activeKey: ACTIVE_KEY, recentKey: RECENT_KEY };
}

/** Maximum number of recently closed tabs kept for the overflow menu. */
export const RECENTLY_CLOSED_LIMIT = 10;

function currentLogin(): string | null {
  return useAuthStore.getState().account?.login ?? null;
}

interface WorkspaceState {
  readonly tabs: readonly WorkspaceTab[];
  readonly activeTabId: string | null;
  /** Recently closed repo tabs, newest first, for the overflow menu. */
  readonly recentlyClosed: readonly RepoWorkspaceTab[];
  openTab(tab: WorkspaceTab): void;
  activateTab(id: string): void;
  closeTab(id: string): void;
  closeOthers(id: string): void;
  closeAll(): void;
  clearRecentlyClosed(): void;
  /** Re-read persisted tabs against the current account. */
  resetForAccount(): void;
}

function loadRecentlyClosed(recentKey: string): RepoWorkspaceTab[] {
  const stored = loadPreference<unknown>(recentKey, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((tab): tab is RepoWorkspaceTab => {
      if (tab === null || typeof tab !== "object") return false;
      const candidate = tab as Partial<RepoWorkspaceTab>;
      return (
        candidate.kind === "repo" &&
        typeof candidate.owner === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.fullName === "string" &&
        typeof candidate.activity === "string"
      );
    })
    .slice(0, RECENTLY_CLOSED_LIMIT);
}

function loadTabs(tabsKey: string): WorkspaceTab[] {
  const scoped = loadPreference<unknown>(tabsKey, undefined);
  const stored =
    scoped !== undefined ? scoped : loadPreference<unknown>(TABS_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((tab): tab is WorkspaceTab => {
    if (tab === null || typeof tab !== "object") return false;
    const candidate = tab as Partial<WorkspaceTab>;
    if (typeof candidate.kind !== "string") return false;
    if (candidate.kind === "repo") {
      const repo = candidate as Partial<Extract<WorkspaceTab, { kind: "repo" }>>;
      return (
        typeof repo.owner === "string" &&
        typeof repo.name === "string" &&
        typeof repo.fullName === "string" &&
        typeof repo.activity === "string"
      );
    }
    return isSingletonKind(candidate.kind as WorkspaceTab["kind"]);
  });
}

function loadActiveTabId(activeKey: string): string | null {
  const scoped = loadPreference<string | null | undefined>(activeKey, undefined);
  const value =
    scoped !== undefined
      ? scoped
      : loadPreference<string | null>(ACTIVE_KEY, null);
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * The open workspace tabs of the IDE shell (persisted across launches).
 *
 * The store owns tab *state* only; navigation is driven by the shell,
 * which reconciles the URL with the active tab.
 */
export const useWorkspaceStore = create<WorkspaceState>()((set, get) => {
  function persist(state: WorkspaceState) {
    const { tabsKey, activeKey } = currentStorageKeys();
    savePreference(tabsKey, state.tabs);
    if (state.activeTabId === null) {
      const preferences: Record<string, unknown> = {};
      try {
        const raw = localStorage.getItem("repoPilot:preferences");
        const parsed = raw ? JSON.parse(raw) : {};
        for (const key of Object.keys(parsed)) preferences[key] = parsed[key];
      } catch {
        // ignore: active tab just won't be restored
      }
      delete preferences[activeKey];
      localStorage.setItem("repoPilot:preferences", JSON.stringify(preferences));
    } else {
      savePreference(activeKey, state.activeTabId);
    }
  }

  function commit(next: Pick<WorkspaceState, "tabs" | "activeTabId">) {
    const state = { ...get(), ...next };
    persist(state);
    set(next);
  }

  return {
    tabs: loadTabs(currentKeys().tabsKey),
    activeTabId: loadActiveTabId(currentKeys().activeKey),
    recentlyClosed: loadRecentlyClosed(currentKeys().recentKey),

    /** Re-read persisted tabs/active tab after the active account changed. */
    resetForAccount() {
      const { tabsKey, activeKey, recentKey } = currentStorageKeys();
      const tabs = loadTabs(tabsKey);
      const activeTabId = loadActiveTabId(activeKey);
      const recentlyClosed = loadRecentlyClosed(recentKey);
      if (activeTabId !== null && !tabs.some((tab) => tabId(tab) === activeTabId)) {
        set({ tabs, activeTabId: null, recentlyClosed });
      } else {
        set({ tabs, activeTabId, recentlyClosed });
      }
    },

    openTab(tab: WorkspaceTab) {
      const { tabs } = get();
      const id = tabId(tab);
      const existingIndex = tabs.findIndex((existing) => tabId(existing) === id);
      const next: WorkspaceTab[] = [...tabs];
      if (existingIndex === -1) {
        next.push(tab);
      } else {
        next[existingIndex] = tab;
      }
      commit({ tabs: next, activeTabId: id });
    },

    activateTab(id: string) {
      const { tabs } = get();
      if (!tabs.some((tab) => tabId(tab) === id)) return;
      commit({ tabs, activeTabId: id });
    },

    closeTab(id: string) {
      const { tabs, activeTabId, recentlyClosed } = get();
      const closed = tabs.find((tab) => tabId(tab) === id);
      const next = tabs.filter((tab) => tabId(tab) !== id);
      const nextActive =
        activeTabId === id ? nextActiveTabId(tabs, id) : activeTabId;
      commit({ tabs: next, activeTabId: nextActive });
      if (closed && closed.kind === "repo") {
        recordRecentlyClosed(closed, recentlyClosed);
      }
    },

    closeOthers(id: string) {
      const { activeTabId } = get();
      const next = tabsFrom(get().tabs, id);
      commit({
        tabs: next,
        activeTabId: activeTabId === id ? id : null,
      });
    },

    closeAll() {
      commit({ tabs: [], activeTabId: null });
    },

    clearRecentlyClosed() {
      const { recentKey } = currentStorageKeys();
      savePreference(recentKey, []);
      set({ recentlyClosed: [] });
    },
  };
});

function tabsFrom(tabs: readonly WorkspaceTab[], id: string): WorkspaceTab[] {
  return tabs.filter((tab) => tabId(tab) === id);
}

/** Prepend a closed repo tab to the per-account recently-closed list. */
function recordRecentlyClosed(
  closed: RepoWorkspaceTab,
  current: readonly WorkspaceTab[],
): void {
  const next: RepoWorkspaceTab[] = [
    closed,
    ...current.filter(
      (tab): tab is RepoWorkspaceTab => tab.kind === "repo" && tab.fullName !== closed.fullName,
    ),
  ].slice(0, RECENTLY_CLOSED_LIMIT);
  const { recentKey } = currentStorageKeys();
  savePreference(recentKey, next);
  useWorkspaceStore.setState({ recentlyClosed: next });
}

function currentKeys() {
  return tabsStorageKeys(currentLogin());
}

function currentStorageKeys() {
  return currentKeys();
}
