import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { CommandPalette } from "./CommandPalette";
import { GlobalSearch } from "./GlobalSearch";
import { NavRail } from "./NavRail";
import { StatusBar } from "./StatusBar";
import { WorkspaceTabBar } from "./WorkspaceTabBar";
import { useWorkspaceStore } from "../store";
import {
  activityFromPathname,
  tabFromPathname,
  tabId,
  tabPath,
} from "../lib/tabs";
import { useUiStore } from "@/stores/ui-store";

/**
 * The Repo Pilot IDE shell: global nav rail, workspace tab strip, active
 * workspace content, and status bar.
 *
 * The shell reconciles the URL with the workspace tab store: navigation
 * to a known route opens (or activates) its tab; on launch the last
 * active persisted tab is restored.
 */
export function AppShell({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = useWorkspaceStore((state) => state.tabs);
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const openTab = useWorkspaceStore((state) => state.openTab);
  const activateTab = useWorkspaceStore((state) => state.activateTab);
  const isFirstRun = useRef(true);

  // Global keyboard shortcuts for the shell.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        useUiStore.getState().setPaletteOpen(true);
      } else if (key === "p") {
        event.preventDefault();
        useUiStore.getState().setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reconcile the active tab with the current route.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      // Restore the last active persisted tab when booting at the home route.
      const restored = tabs.find((tab) => tabId(tab) === activeTabId);
      if ((location.pathname === "/" || location.pathname === "/dashboard") && restored) {
        navigate(tabPath(restored), { replace: true });
        return;
      }
    }
    const tab = tabFromPathname(location.pathname);
    if (!tab) return;
    const activity = activityFromPathname(location.pathname);
    openTab(activity && tab.kind === "repo" ? { ...tab, activity } : tab);
    activateTab(tabId(tab));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-50 dark:bg-surface-0">
      <div className="flex min-h-0 flex-1">
        <NavRail />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden" aria-label="Workspace">
          <WorkspaceTabBar />
          <div className="min-h-0 flex-1 overflow-y-auto">{children ?? <Outlet />}</div>
        </main>
      </div>
      <StatusBar />
      <CommandPalette />
      <GlobalSearch />
    </div>
  );
}
