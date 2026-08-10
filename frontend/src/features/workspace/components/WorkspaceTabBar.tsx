import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { getPinnedRepositoryNames } from "@/features/repositories/services/repository-pins";
import { useWorkspaceStore } from "../store";
import {
  isRepoTab,
  nextActiveTabId,
  repoWorkspacePathForFullName,
  tabFromPathname,
  tabIcon,
  tabId,
  tabPath,
  tabTitle,
  type WorkspaceTab,
} from "../lib/tabs";

interface TabBarItemProps {
  readonly tab: WorkspaceTab;
  readonly isActive: boolean;
  readonly onSelect: () => void;
  readonly onClose: () => void;
}

function TabBarItem({ tab, isActive, onSelect, onClose }: TabBarItemProps) {
  return (
    <div
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      onAuxClick={(event) => {
        if (event.button === 1) onClose();
      }}
      className={`group flex h-8 min-w-0 max-w-56 shrink-0 cursor-pointer items-center gap-1.5 border-r border-surface-200 px-3 text-xs font-medium select-none dark:border-surface-700 ${
        isActive
          ? "bg-surface-0 text-surface-900 dark:bg-surface-50 dark:text-surface-100"
          : "bg-surface-100/60 text-surface-500 hover:bg-surface-100 hover:text-surface-800 dark:bg-surface-800/60 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200"
      }`}
    >
      <Icon
        name={tabIcon(tab)}
        size={12}
        className={isActive ? "text-accent-600 dark:text-accent-500" : "text-surface-400"}
      />
      <span className="min-w-0 truncate">{tabTitle(tab)}</span>
      <button
        type="button"
        aria-label={`Close ${tabTitle(tab)}`}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className={`ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors ${
          isActive
            ? "text-surface-400 hover:bg-surface-200 hover:text-surface-900 dark:text-surface-500 dark:hover:bg-surface-600 dark:hover:text-surface-100"
            : "text-transparent hover:bg-surface-200 hover:text-surface-700 group-hover:text-surface-400 dark:hover:bg-surface-600 dark:hover:text-surface-200"
        }`}
      >
        <Icon name="x" size={10} />
      </button>
    </div>
  );
}

/**
 * Overflow panel listing every open tab plus quick access to recently
 * closed and pinned repositories, so tabs stay reachable once the strip
 * scrolls.
 */
function TabOverflowMenu({ onSelect }: { onSelect: (tab: WorkspaceTab) => void }) {
  const tabs = useWorkspaceStore((state) => state.tabs);
  const recentlyClosed = useWorkspaceStore((state) => state.recentlyClosed);
  const clearRecentlyClosed = useWorkspaceStore((state) => state.clearRecentlyClosed);
  const openTab = useWorkspaceStore((state) => state.openTab);
  const navigate = useNavigate();

  const openFullNames = useMemo(
    () => new Set(tabs.filter(isRepoTab).map((tab) => tab.fullName)),
    [tabs],
  );
  const pinnedNotOpen = useMemo(
    () => getPinnedRepositoryNames().filter((name) => !openFullNames.has(name)).slice(0, 8),
    [openFullNames],
  );

  function openPinned(fullName: string) {
    const tab = tabFromPathname(repoWorkspacePathForFullName(fullName));
    if (tab) {
      openTab(tab);
      navigate(tabPath(tab));
      onSelect(tab);
    }
  }

  const sectionClass = "px-2.5 pt-2 pb-1 text-2xs font-semibold tracking-wide text-surface-400 uppercase";
  const rowClass =
    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-surface-700 transition-colors hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-700";
  const rowIconClass = "shrink-0 text-surface-400";

  return (
    <div className="w-64 pb-1">
      <p className={sectionClass}>Open tabs · {tabs.length}</p>
      {tabs.length === 0 ? (
        <p className="px-2.5 py-1.5 text-xs text-surface-400">No open tabs.</p>
      ) : (
        <ul>
          {tabs.map((tab) => (
            <li key={tabId(tab)}>
              <button type="button" onClick={() => onSelect(tab)} className={rowClass}>
                <Icon name={tabIcon(tab)} size={13} className={rowIconClass} />
                <span className="min-w-0 flex-1 truncate">{tabTitle(tab)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className={`${sectionClass} mt-1`}>
        Recently opened
        {recentlyClosed.length > 0 ? (
          <button
            type="button"
            onClick={clearRecentlyClosed}
            className="ml-2 font-semibold text-accent-600 uppercase hover:underline dark:text-accent-500"
          >
            Clear
          </button>
        ) : null}
      </p>
      {recentlyClosed.length === 0 ? (
        <p className="px-2.5 py-1.5 text-xs text-surface-400">Closed repositories appear here.</p>
      ) : (
        <ul>
          {recentlyClosed.map((tab) => (
            <li key={tabId(tab)}>
              <button type="button" onClick={() => onSelect(tab)} className={rowClass}>
                <Icon name="history" size={13} className={rowIconClass} />
                <span className="min-w-0 flex-1 truncate">{tab.fullName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className={`${sectionClass} mt-1`}>Pinned</p>
      {pinnedNotOpen.length === 0 ? (
        <p className="px-2.5 py-1.5 text-xs text-surface-400">Pinned repositories appear here.</p>
      ) : (
        <ul>
          {pinnedNotOpen.map((fullName) => (
            <li key={fullName}>
              <button type="button" onClick={() => openPinned(fullName)} className={rowClass}>
                <Icon name="pin" size={13} className={rowIconClass} />
                <span className="min-w-0 flex-1 truncate">{fullName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The workspace tab strip: open repositories and pages, VS Code style.
 *
 * Tabs are persisted; closing the active tab navigates to the next one.
 * Ctrl+T opens the repository browser, Ctrl+W closes the active tab, and
 * Ctrl+Tab / Ctrl+Shift+Tab cycle through open tabs.
 */
export function WorkspaceTabBar() {
  const tabs = useWorkspaceStore((state) => state.tabs);
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const openTab = useWorkspaceStore((state) => state.openTab);
  const activateTab = useWorkspaceStore((state) => state.activateTab);
  const closeTab = useWorkspaceStore((state) => state.closeTab);
  const closeOthers = useWorkspaceStore((state) => state.closeOthers);
  const closeAll = useWorkspaceStore((state) => state.closeAll);
  const navigate = useNavigate();
  const barRef = useRef<HTMLDivElement>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const selectTab = useCallback(
    (tab: WorkspaceTab) => {
      activateTab(tabId(tab));
      navigate(tabPath(tab));
    },
    [activateTab, navigate],
  );

  const closeAndNavigate = useCallback(
    (id: string) => {
      const wasActive = activeTabId === id;
      closeTab(id);
      if (wasActive) {
        const next = nextActiveTabId(tabs, id);
        if (next) {
          const target = tabs.find((tab) => tabId(tab) === next);
          if (target) navigate(tabPath(target));
        } else {
          navigate("/repositories");
        }
      }
    },
    [activeTabId, closeTab, navigate, tabs],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === "t") {
        event.preventDefault();
        openTab({ kind: "repositories" });
        navigate("/repositories");
      } else if (key === "w") {
        event.preventDefault();
        if (activeTabId) closeAndNavigate(activeTabId);
      } else if (key === "tab") {
        event.preventDefault();
        const delta = event.shiftKey ? -1 : 1;
        const index = tabs.findIndex((tab) => tabId(tab) === activeTabId);
        if (index !== -1 && tabs.length > 1) {
          const next = tabs[(index + delta + tabs.length) % tabs.length];
          if (next) selectTab(next);
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeTabId, closeAndNavigate, navigate, openTab, selectTab, tabs]);

  if (tabs.length === 0) return null;

  return (
    <div
      ref={barRef}
      role="tablist"
      aria-label="Open workspaces"
      className="flex h-8 shrink-0 items-stretch overflow-x-auto border-b border-surface-200 bg-surface-100/80 dark:border-surface-700 dark:bg-surface-800/80"
    >
      {tabs.map((tab) => {
        const id = tabId(tab);
        return (
          <TabBarItem
            key={id}
            tab={tab}
            isActive={id === activeTabId}
            onSelect={() => selectTab(tab)}
            onClose={() => closeAndNavigate(id)}
          />
        );
      })}
      <div className="ml-auto flex items-center gap-1 pr-2">
        <DropdownMenu
          ariaLabel="All tabs"
          placement="bottom-end"
          minWidth={260}
          open={overflowOpen}
          onOpenChange={setOverflowOpen}
          trigger={
            <Tooltip label="All tabs">
              <button
                type="button"
                aria-label="All tabs"
                className="flex h-6 w-6 items-center justify-center rounded text-surface-400 transition-colors hover:bg-surface-200 hover:text-surface-800 dark:hover:bg-surface-700 dark:hover:text-surface-200"
              >
                <Icon name="chevronDown" size={13} />
              </button>
            </Tooltip>
          }
        >
          <TabOverflowMenu onSelect={() => setOverflowOpen(false)} />
        </DropdownMenu>
        <DropdownMenu
          ariaLabel="Tab actions"
          placement="bottom-end"
          trigger={
            <Tooltip label="Tab actions">
              <button
                type="button"
                aria-label="Tab actions"
                className="flex h-6 w-6 items-center justify-center rounded text-surface-400 transition-colors hover:bg-surface-200 hover:text-surface-800 dark:hover:bg-surface-700 dark:hover:text-surface-200"
              >
                <Icon name="more" size={13} />
              </button>
            </Tooltip>
          }
          items={[
            {
              id: "tab-close-others",
              label: "Close other tabs",
              icon: "x",
              disabled: tabs.length <= 1,
              onSelect: () => {
                if (activeTabId) {
                  closeOthers(activeTabId);
                  const target = tabs.find((tab) => tabId(tab) === activeTabId) ?? tabs[0];
                  if (target) navigate(tabPath(target));
                }
              },
            },
            {
              id: "tab-close-all",
              label: "Close all tabs",
              icon: "trash",
              disabled: tabs.length === 0,
              onSelect: () => {
                closeAll();
                navigate("/dashboard");
              },
            },
          ]}
        />
      </div>
    </div>
  );
}
