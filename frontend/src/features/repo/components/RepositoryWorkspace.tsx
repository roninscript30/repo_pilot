import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { OverviewTab } from "./OverviewTab";
import { RepoSettingsView } from "./RepoSettingsView";
import { RepoActivityRail } from "./RepoActivityRail";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { LocalRepoGate } from "./LocalRepoGate";
import {
  REPO_ACTIVITIES,
  REPO_ACTIVITY_META,
  parseRepoActivity,
  type RepoActivity,
} from "@/features/repo/lib/activity";
import { CodeWorkspace } from "@/features/code/CodeWorkspace";
import { CommitsTab } from "@/features/git/components/CommitsExplorer";
import { PullsTab } from "@/features/pulls/PullsTab";
import { IssuesTab } from "@/features/issues/IssuesTab";
import { ReleasesTab } from "@/features/releases/ReleasesTab";
import { WorktreeView } from "@/features/worktree/components/WorktreeView";
import { SyncCenter } from "@/features/sync/components/SyncCenter";
import { BranchExplorer } from "@/features/branches/components/BranchExplorer";
import { CompareView } from "@/features/compare/components/CompareView";
import { useRepositoryOverview } from "@/features/repositories/hooks";
import { useLocalReposStore } from "@/features/local/store";
import { repoWorkspacePath } from "@/features/workspace/lib/tabs";

/**
 * The repository workspace: one open document per repository.
 *
 * A compact header carries identity, a vertical activity rail switches
 * engineering surfaces, and the active view renders in the content
 * area. Git-engine activities are gated behind a linked local working
 * tree (LocalRepoGate).
 */
export function RepositoryWorkspace() {
  const { owner = "", name = "", activity: activityParam } = useParams<{
    owner: string;
    name: string;
    activity?: string;
  }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fullName = `${owner}/${name}`;
  const activity = parseRepoActivity(activityParam);

  const overview = useRepositoryOverview(fullName);
  const localRepositories = useLocalReposStore((state) => state.repositories);
  const localEntry = localRepositories.find((entry) => entry.fullName === fullName) ?? null;

  const railItems = useMemo(() => {
    const counts = overview.data?.repository;
    return REPO_ACTIVITIES.map((id) => {
      const meta = REPO_ACTIVITY_META[id];
      let badge: number | null = null;
      if (counts) {
        if (id === "pulls" && counts.openPullRequests !== null) badge = counts.openPullRequests;
        if (id === "issues") badge = counts.openIssues;
      }
      return { id, icon: meta.icon, label: meta.label, badge };
    });
  }, [overview.data]);

  function selectActivity(next: RepoActivity) {
    if (next === activity) return;
    navigate(repoWorkspacePath(owner, name, next), { replace: true });
  }

  function selectPath(path: string | null) {
    const next = new URLSearchParams(searchParams);
    if (path === null) next.delete("path");
    else next.set("path", path);
    setSearchParams(next, { replace: true });
  }

  function selectBranch(branch: string) {
    const next = new URLSearchParams(searchParams);
    next.set("branch", branch);
    next.delete("path");
    setSearchParams(next, { replace: true });
  }

  if (overview.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading repository…" />
      </div>
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        <EmptyState
          title="Could not load repository"
          description={
            overview.error instanceof Error
              ? overview.error.message
              : "The repository may be private or the token may lack access."
          }
          action={<Button onClick={() => void overview.refetch()}>Retry</Button>}
        />
      </div>
    );
  }

  const { repository, languages, readme, latestRelease, contributors } = overview.data;
  const codeBranch = searchParams.get("branch") ?? repository.defaultBranch ?? "main";
  const codePath = searchParams.get("path");

  return (
    <div className="flex min-h-full flex-col">
      <WorkspaceHeader repository={repository} latestRelease={latestRelease} localPath={localEntry?.path ?? null} />
      <div className="flex min-h-0 flex-1">
        <RepoActivityRail items={railItems} activeId={activity} onSelect={(id) => selectActivity(parseRepoActivity(id))} />
        <div className="min-w-0 flex-1 overflow-y-auto" aria-label={`${activity} view`}>
          {activity === "overview" ? (
            <div className="px-6 py-5">
              <OverviewTab readme={readme} languages={languages} contributors={contributors} />
            </div>
          ) : activity === "code" ? (
            <CodeWorkspace
              repository={repository}
              path={codePath}
              branch={codeBranch}
              onPathChange={selectPath}
              onBranchChange={selectBranch}
            />
          ) : activity === "commits" ? (
            <div className="px-6 py-5">
              <CommitsTab fullName={repository.fullName} defaultBranch={repository.defaultBranch} />
            </div>
          ) : activity === "pulls" ? (
            <div className="px-6 py-5">
              <PullsTab fullName={repository.fullName} />
            </div>
          ) : activity === "issues" ? (
            <div className="px-6 py-5">
              <IssuesTab fullName={repository.fullName} />
            </div>
          ) : activity === "releases" ? (
            <div className="px-6 py-5">
              <ReleasesTab fullName={repository.fullName} />
            </div>
          ) : activity === "worktree" ? (
            <LocalRepoGate fullName={repository.fullName}>
              {(path) => <WorktreeView path={path} />}
            </LocalRepoGate>
          ) : activity === "sync" ? (
            <LocalRepoGate fullName={repository.fullName}>
              {(path) => <SyncCenter path={path} />}
            </LocalRepoGate>
          ) : activity === "branches" ? (
            <LocalRepoGate fullName={repository.fullName}>
              {(path) => <BranchExplorer path={path} />}
            </LocalRepoGate>
          ) : activity === "compare" ? (
            <LocalRepoGate fullName={repository.fullName}>
              {(path) => <CompareView path={path} />}
            </LocalRepoGate>
          ) : (
            <RepoSettingsView repository={repository} localPath={localEntry?.path ?? null} />
          )}
        </div>
      </div>
    </div>
  );
}
