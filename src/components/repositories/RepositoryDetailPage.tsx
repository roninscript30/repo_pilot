import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useRepositoryOverview } from "@/hooks/use-repositories";
import { useFavoritesStore } from "@/stores/favorites-store";
import { compactNumber, formatDate, timeAgo } from "@/lib/format";
import { cloneUrl } from "@/lib/clone-url";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/toast-context";
import { OverviewTab } from "@/components/repository/OverviewTab";
import { CodeWorkspace } from "@/components/code/CodeWorkspace";
import { CommitsTab } from "@/components/git/CommitsTab";
import { PullsTab } from "@/components/pulls/PullsTab";
import { IssuesTab } from "@/components/issues/IssuesTab";
import { ReleasesTab } from "@/components/releases/ReleasesTab";
import type { Repository } from "@/domain/models/repository";

type WorkspaceTab = "overview" | "code" | "commits" | "pulls" | "issues" | "releases";

const TAB_IDS: readonly WorkspaceTab[] = ["overview", "code", "commits", "pulls", "issues", "releases"];

function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return TAB_IDS.some((id) => id === value);
}

function WorkspaceHeader({ repository, latestRelease }: { repository: Repository; latestRelease: string | null }) {
  const { toast } = useToast();
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const isFavorite = favorites.includes(repository.fullName);

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2 text-2xs text-surface-400">
        <Link to="/repositories" className="hover:text-accent-600 dark:hover:text-accent-500">
          Repositories
        </Link>
        <Icon name="chevronRight" size={11} />
        <span className="text-surface-600 dark:text-surface-300">{repository.fullName}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={repository.owner.login} src={repository.owner.avatarUrl} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold text-surface-900 dark:text-surface-100">
                {repository.fullName}
              </h1>
              {repository.isPrivate ? <Badge>private</Badge> : null}
              {latestRelease ? <Badge tone="accent">v{latestRelease}</Badge> : null}
            </div>
            {repository.description ? (
              <p className="mt-0.5 text-sm text-surface-600 dark:text-surface-300">
                {repository.description}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-surface-400">
              {repository.language ? (
                <span className="inline-flex items-center gap-1.5">
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
              <span className="inline-flex items-center gap-1">
                <Icon name="issue" size={11} /> {repository.openIssues}
              </span>
              {repository.defaultBranch ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name="gitBranch" size={11} /> {repository.defaultBranch}
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-2xs text-surface-400">
              Created {formatDate(repository.createdAt)} · Updated {timeAgo(repository.updatedAt)}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(cloneUrl(repository));
              toast({ title: "Clone URL copied", description: cloneUrl(repository), tone: "success" });
            }}
          >
            <Icon name="copy" size={13} />
            Clone
          </Button>
          <Button
            size="sm"
            variant={isFavorite ? "secondary" : "ghost"}
            onClick={() => {
              const nowFavorite = toggleFavorite(repository.fullName);
              toast(nowFavorite
                ? { title: "Added to favorites", tone: "success" }
                : { title: "Removed from favorites" });
            }}
            aria-pressed={isFavorite}
          >
            <Icon name="star" size={13} />
            {isFavorite ? "Starred" : "Star"}
          </Button>
          <a
            href={repository.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-surface-200 px-2.5 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-700"
          >
            <Icon name="external" size={13} />
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

export function RepositoryDetailPage() {
  const { fullName = "" } = useParams<{ fullName: string }>();
  const overview = useRepositoryOverview(fullName);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const activeTab: WorkspaceTab = useMemo(
    () => (isWorkspaceTab(tabParam) ? tabParam : "overview"),
    [tabParam],
  );

  const tabItems = useMemo(() => {
    const items = [
      { id: "overview", label: "Overview", icon: "home" },
      { id: "code", label: "Code", icon: "code" },
      { id: "commits", label: "Commits", icon: "gitCommit" },
      { id: "pulls", label: "Pull Requests", icon: "gitPull" },
      { id: "issues", label: "Issues", icon: "issue" },
      { id: "releases", label: "Releases", icon: "rocket" },
    ] as const;
    return items.map((item) => {
      if (item.id === "pulls" && overview.data && overview.data.repository.openPullRequests !== null) {
        return { ...item, badge: overview.data.repository.openPullRequests };
      }
      if (item.id === "issues" && overview.data) {
        return { ...item, badge: overview.data.repository.openIssues };
      }
      return item;
    });
  }, [overview.data]);

  function selectTab(id: string) {
    if (isWorkspaceTab(id)) {
      const next = new URLSearchParams(searchParams);
      if (id === "overview") {
        next.delete("tab");
        next.delete("path");
        next.delete("branch");
      } else {
        next.set("tab", id);
      }
      setSearchParams(next, { replace: true });
    }
  }

  function selectPath(path: string | null) {
    const next = new URLSearchParams(searchParams);
    if (path === null) {
      next.delete("path");
    } else {
      next.set("path", path);
    }
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
    <div className="mx-auto max-w-5xl px-6 py-6">
      <WorkspaceHeader repository={repository} latestRelease={latestRelease} />

      <div className="mb-4 border-b border-surface-200 dark:border-surface-700">
        <Tabs items={tabItems} activeId={activeTab} onChange={selectTab} ariaLabel="Repository workspace tabs" size="md" />
      </div>

      {activeTab === "overview" ? (
        <OverviewTab readme={readme} languages={languages} contributors={contributors} />
      ) : activeTab === "code" ? (
        <CodeWorkspace
          repository={repository}
          path={codePath}
          branch={codeBranch}
          onPathChange={selectPath}
          onBranchChange={selectBranch}
        />
      ) : activeTab === "commits" ? (
        <CommitsTab fullName={repository.fullName} defaultBranch={repository.defaultBranch} />
      ) : activeTab === "pulls" ? (
        <PullsTab fullName={repository.fullName} />
      ) : activeTab === "issues" ? (
        <IssuesTab fullName={repository.fullName} />
      ) : (
        <ReleasesTab fullName={repository.fullName} />
      )}
    </div>
  );
}
