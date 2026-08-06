import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { NavRail } from "./NavRail";
import { RepositorySidebar } from "./RepositorySidebar";
import { ContextPanel } from "./ContextPanel";
import { StatusBar } from "./StatusBar";
import { CommandPalette } from "./CommandPalette";
import { GlobalSearch } from "./GlobalSearch";
import { PanelResizer } from "./PanelResizer";
import { useUiStore } from "@/stores/ui-store";
import { loadPreference, savePreference } from "@/services/user-preferences";
import { isRepositoryPath } from "@/lib/route";

const SIDEBAR_WIDTH_KEY = "panel.repo-sidebar-width";
const CONTEXT_WIDTH_KEY = "panel.context-width";
const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 420;
const CONTEXT_MIN = 220;
const CONTEXT_MAX = 420;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The GitOS app shell: global nav rail, resizable repository sidebar,
 * main workspace, context panel, and status bar. Panel sizes persist.
 */
export function AppLayout({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const contextPanelOpen = useUiStore((state) => state.contextPanelOpen);

  const [sidebarWidth, setSidebarWidth] = useState(() =>
    clamp(loadPreference<number>(SIDEBAR_WIDTH_KEY, 232), SIDEBAR_MIN, SIDEBAR_MAX),
  );
  const [contextWidth, setContextWidth] = useState(() =>
    clamp(loadPreference<number>(CONTEXT_WIDTH_KEY, 272), CONTEXT_MIN, CONTEXT_MAX),
  );

  const persistSidebar = useCallback(
    (delta: number) => {
      setSidebarWidth((width) => {
        const next = clamp(width + delta, SIDEBAR_MIN, SIDEBAR_MAX);
        savePreference(SIDEBAR_WIDTH_KEY, next);
        return next;
      });
    },
    [],
  );

  const persistContext = useCallback(
    (delta: number) => {
      setContextWidth((width) => {
        const next = clamp(width + delta, CONTEXT_MIN, CONTEXT_MAX);
        savePreference(CONTEXT_WIDTH_KEY, next);
        return next;
      });
    },
    [],
  );

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
      } else if (key === "]") {
        event.preventDefault();
        useUiStore.getState().toggleContextPanel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // The context panel only shows on repository workspace routes.
  const showContextPanel = contextPanelOpen && isRepositoryPath(location.pathname);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-50 dark:bg-surface-0">
      <div className="flex min-h-0 flex-1">
        <NavRail />
        <RepositorySidebar width={sidebarWidth} />
        <PanelResizer orientation="vertical" ariaLabel="Resize repository sidebar" onResize={persistSidebar} />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden" aria-label="Workspace">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {children ?? <Outlet />}
          </div>
        </main>

        {showContextPanel ? (
          <>
            <PanelResizer orientation="vertical" ariaLabel="Resize context panel" onResize={persistContext} />
            <div className="shrink-0 border-l border-surface-200 dark:border-surface-600" style={{ width: contextWidth }}>
              <ContextPanel />
            </div>
          </>
        ) : null}
      </div>

      <StatusBar />
      <CommandPalette />
      <GlobalSearch />
    </div>
  );
}
