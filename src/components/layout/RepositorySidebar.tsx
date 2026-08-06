import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { useRepositories } from "@/hooks/use-repositories";
import { getRecentRepositories } from "@/services/recent-repositories";
import { partitionByPins } from "@/hooks/use-repositories";
import { Icon } from "@/components/ui/Icon";
import { SearchInput } from "@/components/ui/SearchInput";
import { SkeletonText } from "@/components/ui/Skeleton";
import { useUiStore } from "@/stores/ui-store";

interface RepoItemProps {
  readonly fullName: string;
  readonly isActive: boolean;
  readonly isPrivate?: boolean;
  readonly pinned?: boolean;
}

function RepoItem({ fullName, isActive, isPrivate, pinned }: RepoItemProps) {
  return (
    <Link
      to={`/repositories/${fullName}`}
      className={`group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
        isActive
          ? "bg-accent-500/12 text-accent-700 dark:bg-accent-500/20 dark:text-accent-500"
          : "text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-100"
      }`}
    >
      <Icon
        name={isPrivate ? "lock" : "repo"}
        size={13}
        className={isActive ? "text-accent-500" : "text-surface-400"}
      />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{fullName}</span>
      {pinned ? <Icon name="pin" size={11} className="shrink-0 text-surface-300 dark:text-surface-500" /> : null}
    </Link>
  );
}

/** Repository sidebar: search, pinned, recent, and all repositories. */
export function RepositorySidebar({ width }: { width: number }) {
  const [query, setQuery] = useState("");
  const account = useAuthStore((state) => state.account);
  const repositories = useRepositories(account !== null);
  const location = useLocation();
  const setPaletteOpen = useUiStore((state) => state.setPaletteOpen);

  const currentRepo = location.pathname.startsWith("/repositories/")
    ? location.pathname.split("/")[2] ?? ""
    : "";

  const { pinned, others } = partitionByPins(repositories.data);
  const recent = getRecentRepositories().filter((name) =>
    (repositories.data ?? []).some((repo) => repo.fullName === name),
  );

  const filtered = query.trim()
    ? (repositories.data ?? []).filter((repo) => repo.fullName.toLowerCase().includes(query.trim().toLowerCase()))
    : null;

  const visiblePinned = filtered ?? pinned;
  const visibleOthers = filtered ?? others;

  return (
    <aside
      aria-label="Repositories"
      className="flex h-full flex-col overflow-hidden border-r border-surface-200 bg-surface-0 dark:border-surface-600"
      style={{ width }}
    >
      <div className="border-b border-surface-100 p-2.5 dark:border-surface-700">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Filter repositories…"
          hint={
            <button
              type="button"
              aria-label="Open command palette"
              onClick={() => setPaletteOpen(true)}
              className="rounded border border-surface-200 bg-surface-0 px-1 font-mono text-2xs text-surface-400 dark:border-surface-600 dark:bg-surface-800"
            >
              ⌘K
            </button>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {repositories.isLoading ? (
          <div className="space-y-2 px-2 py-1">
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <SkeletonText key={index} className="h-5 w-full" />
            ))}
          </div>
        ) : visiblePinned.length > 0 ? (
          <>
            <p className="px-2 pt-1 pb-1 text-2xs font-semibold tracking-wide text-surface-400 uppercase">
              Pinned
            </p>
            <ul className="space-y-0.5">
              {visiblePinned.map((repo) => (
                <li key={repo.id}>
                  <RepoItem
                    fullName={repo.fullName}
                    isPrivate={repo.isPrivate}
                    pinned
                    isActive={currentRepo === repo.fullName}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {recent.length > 0 && !filtered ? (
          <>
            <p className="px-2 pt-3 pb-1 text-2xs font-semibold tracking-wide text-surface-400 uppercase">
              Recent
            </p>
            <ul className="space-y-0.5">
              {recent.map((fullName) => (
                <li key={fullName}>
                  <RepoItem fullName={fullName} isActive={currentRepo === fullName} />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {visibleOthers.length > 0 ? (
          <>
            <p className="px-2 pt-3 pb-1 text-2xs font-semibold tracking-wide text-surface-400 uppercase">
              {filtered ? "Results" : "Repositories"}
            </p>
            <ul className="space-y-0.5">
              {visibleOthers.slice(0, 50).map((repo) => (
                <li key={repo.id}>
                  <RepoItem
                    fullName={repo.fullName}
                    isPrivate={repo.isPrivate}
                    isActive={currentRepo === repo.fullName}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {repositories.isSuccess && repositories.data?.length === 0 ? (
          <p className="px-3 py-4 text-xs text-surface-500">
            No repositories yet. Connect an account with repository access.
          </p>
        ) : null}
      </div>

      <div className="border-t border-surface-100 p-2 dark:border-surface-700">
        <Link
          to="/repositories"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-100"
        >
          <Icon name="repos" size={14} />
          All repositories
        </Link>
      </div>
    </aside>
  );
}
