import { Link } from "react-router-dom";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/toast-context";
import { useFavoritesStore } from "@/stores/favorites-store";
import { compactNumber, formatDate, timeAgo } from "@/lib/format";
import { cloneUrl } from "@/lib/clone-url";
import { openLocalFolder } from "@/services/open-folder";
import type { Repository } from "@/domain/models/repository";

interface WorkspaceHeaderProps {
  readonly repository: Repository;
  readonly latestRelease: string | null;
  /** Linked local working tree path, when one is tracked. */
  readonly localPath: string | null;
}

/** Repository identity header shown above every activity surface. */
export function WorkspaceHeader({ repository, latestRelease, localPath }: WorkspaceHeaderProps) {
  const { toast } = useToast();
  const isFavorite = useFavoritesStore((state) => state.favorites.includes(repository.fullName));
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  return (
    <div className="border-b border-surface-200 px-6 pb-4 pt-3 dark:border-surface-700">
      <div className="mb-2 flex items-center gap-2 text-2xs text-surface-400">
        <Link
          to="/repositories"
          className="hover:text-accent-600 dark:hover:text-accent-500"
        >
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
              <span className="inline-flex items-center gap-1">
                <Icon name={localPath ? "checkCircle" : "folder"} size={11} />
                {localPath ? "Local copy linked" : "No local copy"}
              </span>
            </div>
            <div className="mt-1 text-2xs text-surface-400">
              Created {formatDate(repository.createdAt)} · Updated {timeAgo(repository.updatedAt)}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {localPath ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void (async () => {
                  const opened = await openLocalFolder(localPath);
                  if (opened) {
                    toast({ title: "Opened local folder", tone: "success" });
                  } else {
                    toast({ title: "Open local folder", description: localPath, tone: "info" });
                  }
                })();
              }}
            >
              <Icon name="folder" size={13} />
              Open local
            </Button>
          ) : null}
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
              toast(
                nowFavorite
                  ? { title: "Added to favorites", tone: "success" }
                  : { title: "Removed from favorites" },
              );
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
