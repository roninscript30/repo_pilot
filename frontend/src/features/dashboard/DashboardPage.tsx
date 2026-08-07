import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { useRepositories } from "@/features/repositories/hooks";
import { useCollaborationDashboard } from "@/features/dashboard/hooks";
import { useCommitActivity } from "@/features/dashboard/repository-data-hooks";
import { repositoryHealth } from "@/lib/repository-health";
import { repoWorkspacePathForFullName } from "@/features/workspace/lib/tabs";
import { getRecentSearches } from "@/services/recent-searches";
import { compactNumber, timeAgo } from "@/lib/format";
import { shortSha } from "@/domain/models/commit";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { StatusDot, type StatusTone } from "@/components/ui/StatusDot";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useUiStore } from "@/stores/ui-store";
import type { Repository } from "@/domain/models/repository";
import type { WorkflowRun } from "@/domain/models/workflow";

const HEALTH_TONE: Record<string, StatusTone> = {
  healthy: "success",
  attention: "warning",
  stale: "neutral",
};

function Greeting() {
  const account = useAuthStore((state) => state.account);
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (account?.displayName ?? "there").split(" ")[0] ?? "there";
  return <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">{timeOfDay}, {firstName}</h1>;
}

function PinnedRepoCard({ repository }: { repository: Repository }) {
  const health = repositoryHealth(repository);
  return (
    <Link
      to={repoWorkspacePathForFullName(repository.fullName)}
      className="group flex flex-col rounded-xl border border-surface-200 bg-surface-0 p-4 shadow-card transition-all hover:border-accent-300 hover:shadow-pop dark:border-surface-600 dark:bg-surface-50 dark:hover:border-accent-700"
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={repository.owner.login} src={repository.owner.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-surface-900 group-hover:text-accent-700 dark:text-surface-100 dark:group-hover:text-accent-500">
            {repository.name}
          </p>
          <p className="truncate text-2xs text-surface-400">{repository.owner.login}</p>
        </div>
        <StatusDot tone={HEALTH_TONE[health.level] ?? "neutral"} label={health.label} />
      </div>
      {repository.description ? (
        <p className="mt-2.5 line-clamp-2 text-xs text-surface-500">{repository.description}</p>
      ) : null}
      <div className="mt-3 flex items-center gap-3 text-2xs text-surface-400">
        {repository.language ? (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-accent-400" />
            {repository.language}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <Icon name="star" size={11} /> {compactNumber(repository.stars)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="gitFork" size={11} /> {compactNumber(repository.forks)}
        </span>
        <span className="ml-auto">{repository.pushedAt ? timeAgo(repository.pushedAt) : "—"}</span>
      </div>
    </Link>
  );
}

function StatCard({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-surface-200 bg-surface-0 p-3.5 shadow-card dark:border-surface-600 dark:bg-surface-50">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-500">
        <Icon name={icon} size={17} />
      </span>
      <div className="min-w-0">
        <p className="text-lg leading-tight font-bold text-surface-900 dark:text-surface-100">{value}</p>
        <p className="truncate text-2xs text-surface-500">{label}</p>
        {sub ? <p className="truncate text-2xs text-surface-400">{sub}</p> : null}
      </div>
    </div>
  );
}

function WorkflowBadge({ run }: { run: WorkflowRun }) {
  if (run.conclusion === "success") return <Badge tone="success">passed</Badge>;
  if (run.conclusion === "failure") return <Badge tone="danger">failed</Badge>;
  if (run.status === "in_progress") return <Badge tone="accent">running</Badge>;
  return <Badge>queued</Badge>;
}

export function DashboardPage() {
  const account = useAuthStore((state) => state.account);
  const repositories = useRepositories(account !== null);
  const setSearchOpen = useUiStore((state) => state.setSearchOpen);
  const dashboard = useCollaborationDashboard(account?.login ?? null, repositories.data ?? []);
  const recentSearches = useMemo(() => getRecentSearches(), []);

  const pinned = repositories.data?.filter((repo) => repo.isPinned) ?? [];
  const recent = [...(repositories.data ?? [])]
    .sort((a, b) => (b.pushedAt ?? "").localeCompare(a.pushedAt ?? ""))
    .slice(0, 3);

  const isLoading = repositories.isLoading;

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Greeting />
          <p className="mt-0.5 text-sm text-surface-500">
            Your engineering control center ·{" "}
            {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-surface-200 bg-surface-0 px-3 text-xs font-medium text-surface-600 shadow-card transition-colors hover:border-accent-300 hover:text-surface-900 dark:border-surface-600 dark:bg-surface-50 dark:text-surface-300"
          >
            <Icon name="search" size={13} />
            Search everything
          </button>
        </div>
      </div>

      {repositories.isError ? (
        <ErrorState
          title="Could not load dashboard"
          description={repositories.error instanceof Error ? repositories.error.message : "Check your token permissions."}
          onRetry={() => void repositories.refetch()}
        />
      ) : (
        <div className="space-y-5">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {isLoading ? (
              [1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-[68px] w-full" />)
            ) : (
              <>
                <StatCard icon="repos" label="Repositories" value={String(repositories.data?.length ?? 0)} />
                <StatCard
                  icon="gitMerge"
                  label="Open pull requests"
                  value={String(dashboard.pullRequests.length)}
                  sub="across pinned repositories"
                />
                <StatCard
                  icon="issue"
                  label="Assigned to you"
                  value={String(dashboard.issues.length)}
                  sub="across pinned repositories"
                />
                <StatCard icon="gitCommit" label="Recent commits" value={String(dashboard.commits.length)} sub="last 7 days" />
              </>
            )}
          </div>

          {/* Pinned repositories */}
          <section aria-label="Pinned repositories">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Pinned repositories</h2>
              <Link to="/repositories" className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-500">
                View all
              </Link>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[1, 2, 3].map((index) => <Skeleton key={index} className="h-28 w-full" />)}
              </div>
            ) : pinned.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {pinned.map((repo) => (
                  <PinnedRepoCard key={repo.id} repository={repo} />
                ))}
              </div>
            ) : (
              <Card>
                <div className="flex items-center gap-3 p-4">
                  <Icon name="pin" size={16} className="text-surface-400" />
                  <p className="text-xs text-surface-500">
                    No pinned repositories yet. Pin repositories from the browser to see them here.
                  </p>
                  <Link to="/repositories" className="ml-auto text-xs font-medium text-accent-600 hover:underline dark:text-accent-500">
                    Browse
                  </Link>
                </div>
              </Card>
            )}
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Activity: recent commits */}
            <Card>
              <CardHeader title="Recent activity" subtitle="Commits across your repositories" action={<Icon name="activity" size={14} className="text-surface-400" />} />
              {isLoading ? (
                <SkeletonList rows={4} />
              ) : dashboard.commits.length === 0 ? (
                <div className="p-4 text-xs text-surface-500">No commit activity found.</div>
              ) : (
                <ul className="divide-y divide-surface-100 dark:divide-surface-700">
                  {dashboard.commits.slice(0, 7).map(({ commit, fullName }) => (
                    <li key={`${fullName}-${commit.sha}`} className="flex items-center gap-3 px-4 py-2.5">
                      <Avatar name={commit.author.name} src={commit.author.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`${repoWorkspacePathForFullName(fullName, "commits")}?sha=${commit.sha}`}
                          className="block truncate text-[13px] font-medium text-surface-800 hover:text-accent-700 dark:text-surface-200 dark:hover:text-accent-500"
                        >
                          {commit.subject}
                        </Link>
                        <p className="truncate text-2xs text-surface-400">
                          {fullName} · {shortSha(commit.sha)} · {timeAgo(commit.committedAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Pull requests */}
            <Card>
              <CardHeader title="Active pull requests" subtitle="Open PRs in pinned repositories" action={<Icon name="gitMerge" size={14} className="text-surface-400" />} />
              {isLoading ? (
                <SkeletonList rows={4} />
              ) : dashboard.pullRequests.length === 0 ? (
                <div className="p-4 text-xs text-surface-500">No open pull requests.</div>
              ) : (
                <ul className="divide-y divide-surface-100 dark:divide-surface-700">
                  {dashboard.pullRequests.slice(0, 7).map(({ pull, fullName }) => (
                    <li key={`${fullName}-${pull.number}`} className="flex items-center gap-3 px-4 py-2.5">
                      <Avatar name={pull.author.login} src={pull.author.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={repoWorkspacePathForFullName(fullName, "pulls")}
                          className="block truncate text-[13px] font-medium text-surface-800 hover:text-accent-700 dark:text-surface-200 dark:hover:text-accent-500"
                        >
                          {pull.title}
                        </Link>
                        <p className="truncate text-2xs text-surface-400">
                          {fullName} · #{pull.number} · {pull.headBranch} → {pull.baseBranch}
                        </p>
                      </div>
                      {pull.isDraft ? <Badge>draft</Badge> : null}
                      {pull.reviewDecision === "approved" ? <Badge tone="success">approved</Badge> : null}
                      {pull.reviewDecision === "changes_requested" ? <Badge tone="danger">changes requested</Badge> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Assigned issues */}
            <Card>
              <CardHeader title="Assigned issues" subtitle="Open issues assigned to you" action={<Icon name="issue" size={14} className="text-surface-400" />} />
              {isLoading ? (
                <SkeletonList rows={4} />
              ) : dashboard.issues.length === 0 ? (
                <div className="p-4 text-xs text-surface-500">Nothing assigned to you right now.</div>
              ) : (
                <ul className="divide-y divide-surface-100 dark:divide-surface-700">
                  {dashboard.issues.slice(0, 7).map(({ issue, fullName }) => (
                    <li key={`${fullName}-${issue.number}`} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-info-50 text-info-600 dark:bg-info-500/15 dark:text-info-500">
                        <Icon name="issue" size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={repoWorkspacePathForFullName(fullName, "issues")}
                          className="block truncate text-[13px] font-medium text-surface-800 hover:text-accent-700 dark:text-surface-200 dark:hover:text-accent-500"
                        >
                          {issue.title}
                        </Link>
                        <p className="truncate text-2xs text-surface-400">
                          {fullName} · #{issue.number} · {timeAgo(issue.updatedAt)}
                        </p>
                      </div>
                      {issue.labels.slice(0, 2).map((label) => (
                        <Badge key={label.name}>{label.name}</Badge>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Workflow status */}
            <Card>
              <CardHeader title="Workflow status" subtitle="Latest CI runs in pinned repositories" action={<Icon name="zap" size={14} className="text-surface-400" />} />
              {isLoading ? (
                <SkeletonList rows={4} />
              ) : dashboard.workflowRuns.length === 0 ? (
                <div className="p-4 text-xs text-surface-500">
                  No workflow runs available. The token may need Actions permission.
                </div>
              ) : (
                <ul className="divide-y divide-surface-100 dark:divide-surface-700">
                  {dashboard.workflowRuns.slice(0, 6).map(({ run, fullName }) => (
                    <li key={`${fullName}-${run.id}`} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-300">
                        <Icon name="zap" size={12} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-surface-800 dark:text-surface-200">{run.displayTitle}</p>
                        <p className="truncate text-2xs text-surface-400">
                          {fullName} · {run.headBranch} · run #{run.runNumber}
                        </p>
                      </div>
                      <WorkflowBadge run={run} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Contribution activity + recent searches */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Contribution activity" subtitle="Commits per week in the most recently updated repository" action={<Icon name="activity" size={14} className="text-surface-400" />} />
              {recent[0] ? <CommitActivityChart fullName={recent[0].fullName} /> : <div className="p-4 text-xs text-surface-500">No repositories to chart.</div>}
            </Card>
            <Card>
              <CardHeader title="Recent searches" />
              {recentSearches.length === 0 ? (
                <div className="p-4 text-xs text-surface-500">Search with ⌘P and your queries will appear here.</div>
              ) : (
                <ul className="divide-y divide-surface-100 dark:divide-surface-700">
                  {recentSearches.map((query) => (
                    <li key={query}>
                      <Link
                        to={`/repositories?q=${encodeURIComponent(query)}`}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-surface-700 transition-colors hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-700/60"
                      >
                        <Icon name="search" size={13} className="text-surface-400" />
                        <span className="truncate">{query}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function CommitActivityChart({ fullName }: { fullName: string }) {
  const activity = useCommitActivity(fullName);

  if (activity.isLoading) return <SkeletonList rows={3} />;
  if (activity.isError || !activity.data) return <div className="p-4 text-xs text-surface-500">Activity chart unavailable.</div>;

  const weeks = activity.data.slice(-14);
  const max = Math.max(1, ...weeks.map((week) => week.total));

  return (
    <div className="flex items-end gap-1.5 p-4">
      {weeks.map((week) => (
        <div key={week.week} className="flex flex-1 flex-col items-center gap-1" title={`${new Date(week.week * 1000).toLocaleDateString("en", { month: "short", day: "numeric" })} · ${week.total} commits`}>
          <div
            className="w-full rounded-sm bg-accent-500/80 transition-all"
            style={{ height: `${Math.max(2, (week.total / max) * 72)}px` }}
          />
          <span className="text-2xs text-surface-400">{new Date(week.week * 1000).toLocaleDateString("en", { month: "short" })}</span>
        </div>
      ))}
    </div>
  );
}
