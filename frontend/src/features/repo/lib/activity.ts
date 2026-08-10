import type { IconName } from "@/components/ui/Icon";

/**
 * The activities available inside a repository workspace.
 *
 * Each activity is a distinct engineering surface of the repository
 * document. The ordering here defines the activity rail order.
 */
export const REPO_ACTIVITIES = [
  "overview",
  "code",
  "worktree",
  "commits",
  "branches",
  "sync",
  "compare",
  "pulls",
  "issues",
  "releases",
  "activity",
  "settings",
] as const;

export type RepoActivity = (typeof REPO_ACTIVITIES)[number];

export const DEFAULT_REPO_ACTIVITY: RepoActivity = "overview";

export interface RepoActivityMeta {
  readonly icon: IconName;
  readonly label: string;
}

export const REPO_ACTIVITY_META: Record<RepoActivity, RepoActivityMeta> = {
  overview: { icon: "home", label: "Overview" },
  code: { icon: "code", label: "Code" },
  worktree: { icon: "fileText", label: "Working Tree" },
  commits: { icon: "gitCommit", label: "Commits" },
  branches: { icon: "gitBranch", label: "Branches" },
  sync: { icon: "refresh", label: "Sync" },
  compare: { icon: "gitCompare", label: "Compare" },
  pulls: { icon: "gitMerge", label: "Pull Requests" },
  issues: { icon: "issue", label: "Issues" },
  releases: { icon: "rocket", label: "Releases" },
  activity: { icon: "activity", label: "Activity" },
  settings: { icon: "settings", label: "Repository Settings" },
};

/** Narrow a raw string (e.g. a route param) to a known activity. */
export function isRepoActivity(value: string | null | undefined): value is RepoActivity {
  return REPO_ACTIVITIES.some((activity) => activity === value);
}

/** Parse a raw activity value, falling back to the default activity. */
export function parseRepoActivity(value: string | null | undefined): RepoActivity {
  return isRepoActivity(value) ? value : DEFAULT_REPO_ACTIVITY;
}
