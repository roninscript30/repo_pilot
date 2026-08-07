import type { IconName } from "@/components/ui/Icon";
import {
  DEFAULT_REPO_ACTIVITY,
  isRepoActivity,
  type RepoActivity,
} from "@/features/repo/lib/activity";

/**
 * Workspace tabs are the open documents of the Repository IDE shell.
 *
 * Singleton tabs (dashboard, repositories, sandbox, local, settings) can
 * appear at most once. Repository tabs are one per repository and keep
 * the last active activity so returning to a tab restores its context.
 */
export type WorkspaceTab =
  | { readonly kind: "dashboard" }
  | { readonly kind: "repositories" }
  | {
      readonly kind: "repo";
      readonly owner: string;
      readonly name: string;
      readonly fullName: string;
      readonly activity: RepoActivity;
    }
  | { readonly kind: "sandbox" }
  | { readonly kind: "local" }
  | { readonly kind: "settings" };

export type RepoWorkspaceTab = Extract<WorkspaceTab, { kind: "repo" }>;

/** Kinds that must never appear more than once in the tab bar. */
const SINGLETON_KINDS = new Set<WorkspaceTab["kind"]>(["dashboard", "repositories", "sandbox", "local", "settings"]);

/** Stable unique id for a tab; repository tabs are keyed by full name. */
export function tabId(tab: WorkspaceTab): string {
  return tab.kind === "repo" ? `repo:${tab.fullName}` : tab.kind;
}

/** Human-readable tab title shown in the tab bar. */
export function tabTitle(tab: WorkspaceTab): string {
  switch (tab.kind) {
    case "repo":
      return tab.fullName;
    case "dashboard":
      return "Dashboard";
    case "repositories":
      return "Repositories";
    case "sandbox":
      return "Git Sandbox";
    case "local":
      return "Local Repos";
    case "settings":
      return "Settings";
  }
}

export function tabIcon(tab: WorkspaceTab): IconName {
  switch (tab.kind) {
    case "repo":
      return "repo";
    case "dashboard":
      return "dashboard";
    case "repositories":
      return "repos";
    case "sandbox":
      return "box";
    case "local":
      return "folder";
    case "settings":
      return "settings";
  }
}

/** Route path that renders this tab. */
export function tabPath(tab: WorkspaceTab): string {
  switch (tab.kind) {
    case "repo":
      return repoWorkspacePath(tab.owner, tab.name, tab.activity);
    case "dashboard":
      return "/dashboard";
    case "repositories":
      return "/repositories";
    case "sandbox":
      return "/sandbox";
    case "local":
      return "/local";
    case "settings":
      return "/settings";
  }
}

/** Path to a repository workspace, optionally at a specific activity. */
export function repoWorkspacePath(
  owner: string,
  name: string,
  activity?: RepoActivity,
): string {
  const base = `/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  return activity && activity !== DEFAULT_REPO_ACTIVITY ? `${base}/${activity}` : base;
}

/** Path to a repository workspace from a "owner/name" full name. */
export function repoWorkspacePathForFullName(
  fullName: string,
  activity?: RepoActivity,
): string {
  const [owner = "", name = ""] = fullName.split("/");
  return repoWorkspacePath(owner, name, activity);
}

export function isRepoTab(tab: WorkspaceTab): tab is RepoWorkspaceTab {
  return tab.kind === "repo";
}

export function isSingletonTab(tab: WorkspaceTab): boolean {
  return SINGLETON_KINDS.has(tab.kind);
}

export function isSingletonKind(kind: WorkspaceTab["kind"]): boolean {
  return SINGLETON_KINDS.has(kind);
}

/** Derive the workspace tab represented by a pathname, or null. */
export function tabFromPathname(pathname: string): WorkspaceTab | null {
  const parts = pathname.split("/").filter(Boolean);
  const [first, second, third] = parts;

  if (first === "dashboard") return { kind: "dashboard" };
  if (first === "repositories") return { kind: "repositories" };
  if (first === "sandbox") return { kind: "sandbox" };
  if (first === "local") return { kind: "local" };
  if (first === "settings") return { kind: "settings" };
  if (first === "repo" && second && third) {
    const owner = decodeURIComponent(second);
    const name = decodeURIComponent(third);
    const activity = parts[3];
    return {
      kind: "repo",
      owner,
      name,
      fullName: `${owner}/${name}`,
      activity: isRepoActivity(activity) ? activity : DEFAULT_REPO_ACTIVITY,
    };
  }
  return null;
}

/** The activity referenced by a repo workspace pathname, or null. */
export function activityFromPathname(pathname: string): RepoActivity | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "repo" || parts.length < 4) return null;
  return isRepoActivity(parts[3]) ? parts[3] : null;
}

/**
 * The tab to activate after closing `closedId`: the tab that followed it,
 * otherwise the one before it, otherwise null.
 */
export function nextActiveTabId(
  tabs: readonly WorkspaceTab[],
  closedId: string,
): string | null {
  const index = tabs.findIndex((tab) => tabId(tab) === closedId);
  if (index === -1) return null;
  const after = tabs[index + 1];
  if (after) return tabId(after);
  const before = tabs[index - 1];
  return before ? tabId(before) : null;
}
