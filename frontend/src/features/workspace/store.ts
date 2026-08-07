import { create } from "zustand";
import { loadPreference, savePreference } from "@/services/user-preferences";
import {
  isSingletonKind,
  nextActiveTabId,
  tabId,
  type WorkspaceTab,
} from "./lib/tabs";

const TABS_KEY = "workspace.tabs";
const ACTIVE_KEY = "workspace.active-tab";

interface WorkspaceState {
  readonly tabs: readonly WorkspaceTab[];
  readonly activeTabId: string | null;
  openTab(tab: WorkspaceTab): void;
  activateTab(id: string): void;
  closeTab(id: string): void;
  closeOthers(id: string): void;
  closeAll(): void;
}

function loadTabs(): WorkspaceTab[] {
  const stored = loadPreference<unknown>(TABS_KEY, []);
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

function loadActiveTabId(): string | null {
  const value = loadPreference<string | null>(ACTIVE_KEY, null);
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
    savePreference(TABS_KEY, state.tabs);
    if (state.activeTabId === null) {
      const preferences: Record<string, unknown> = {};
      try {
        const raw = localStorage.getItem("repoPilot:preferences");
        const parsed = raw ? JSON.parse(raw) : {};
        for (const key of Object.keys(parsed)) preferences[key] = parsed[key];
      } catch {
        // ignore: active tab just won't be restored
      }
      delete preferences[ACTIVE_KEY];
      localStorage.setItem("repoPilot:preferences", JSON.stringify(preferences));
    } else {
      savePreference(ACTIVE_KEY, state.activeTabId);
    }
  }

  function commit(next: Pick<WorkspaceState, "tabs" | "activeTabId">) {
    const state = { ...get(), ...next };
    persist(state);
    set(next);
  }

  return {
    tabs: loadTabs(),
    activeTabId: loadActiveTabId(),

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
      const { tabs, activeTabId } = get();
      const next = tabs.filter((tab) => tabId(tab) !== id);
      const nextActive =
        activeTabId === id ? nextActiveTabId(tabs, id) : activeTabId;
      commit({ tabs: next, activeTabId: nextActive });
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
  };
});

function tabsFrom(tabs: readonly WorkspaceTab[], id: string): WorkspaceTab[] {
  return tabs.filter((tab) => tabId(tab) === id);
}
