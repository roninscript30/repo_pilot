import { useQueries } from "@tanstack/react-query";
import type { Repository } from "@/domain/models/repository";
import type { PullRequest } from "@/domain/models/pull-request";
import type { Issue } from "@/domain/models/issue";
import type { WorkflowRun } from "@/domain/models/workflow";
import type { CommitSummary } from "@/domain/models/commit";
import { providerRegistry } from "@/providers/registry";

const MAX_SCOPED_REPOS = 3;
const ACTIVITY_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface Scoped {
  readonly fullName: string;
}

export interface DashboardScopedPull extends Scoped {
  readonly pull: PullRequest;
}

export interface DashboardScopedIssue extends Scoped {
  readonly issue: Issue;
}

export interface DashboardScopedCommit extends Scoped {
  readonly commit: CommitSummary;
}

export interface DashboardScopedRun extends Scoped {
  readonly run: WorkflowRun;
}

interface DashboardData {
  readonly pullRequests: readonly DashboardScopedPull[];
  readonly issues: readonly DashboardScopedIssue[];
  readonly commits: readonly DashboardScopedCommit[];
  readonly workflowRuns: readonly DashboardScopedRun[];
}

/**
 * Aggregates collaboration data across the user's top repositories for
 * the dashboard. Query fan-out is bounded to MAX_SCOPED_REPOS.
 */
export function useCollaborationDashboard(login: string | null, repositories: readonly Repository[]): DashboardData {
  const scoped = repositories
    .filter((repo) => repo.isPinned || repo.openPullRequests !== 0)
    .sort((a, b) => (b.pushedAt ?? "").localeCompare(a.pushedAt ?? ""))
    .slice(0, MAX_SCOPED_REPOS);

  const fullNames = scoped.map((repo) => repo.fullName);
  const provider = providerRegistry.githubProvider();

  const pullsQueries = useQueries({
    queries: fullNames.map((fullName) => ({
      queryKey: ["dashboard", fullName, "pulls"],
      queryFn: () => provider.listPullRequests(fullName, { state: "open", limit: 10 }),
      staleTime: 60_000,
    })),
  });

  const issuesQueries = useQueries({
    queries: fullNames.map((fullName) => ({
      queryKey: ["dashboard", fullName, "issues"],
      queryFn: () => provider.listIssues(fullName, { state: "open", limit: 20 }),
      staleTime: 60_000,
    })),
  });

  const commitsQueries = useQueries({
    queries: fullNames.map((fullName) => ({
      queryKey: ["dashboard", fullName, "commits"],
      queryFn: () => provider.listCommits(fullName, { limit: 20 }),
      staleTime: 60_000,
    })),
  });

  const runsQueries = useQueries({
    queries: fullNames.map((fullName) => ({
      queryKey: ["dashboard", fullName, "runs"],
      queryFn: () => provider.listWorkflowRuns(fullName, 5),
      staleTime: 60_000,
    })),
  });

  const pullRequests = pullsQueries.flatMap((query, index) =>
    (query.data ?? []).map((pull) => ({ pull, fullName: fullNames[index] ?? "" })),
  );

  const issues = issuesQueries.flatMap((query, index) =>
    (query.data ?? []).filter((issue) => login !== null && issue.assignees.some((assignee) => assignee.login === login)).map((issue) => ({ issue, fullName: fullNames[index] ?? "" })),
  );

  const commits = commitsQueries.flatMap((query, index) =>
    (query.data ?? [])
      .filter((commit) => Date.now() - new Date(commit.committedAt).getTime() < ACTIVITY_DAYS_MS)
      .map((commit) => ({ commit, fullName: fullNames[index] ?? "" })),
  ).sort((a, b) => b.commit.committedAt.localeCompare(a.commit.committedAt));

  const workflowRuns = runsQueries.flatMap((query, index) =>
    (query.data ?? []).slice(0, 2).map((run) => ({ run, fullName: fullNames[index] ?? "" })),
  ).sort((a, b) => b.run.updatedAt.localeCompare(a.run.updatedAt));

  return { pullRequests, issues, commits, workflowRuns };
}
