import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { useRepositories, useSearchRepositories } from "@/features/repositories/hooks";
import { useFavoritesStore } from "@/stores/favorites-store";
import { repositoryHealth } from "@/lib/repository-health";
import { repoWorkspacePathForFullName } from "@/features/workspace/lib/tabs";
import { compactNumber, timeAgo } from "@/lib/format";
import { cloneUrl } from "@/lib/clone-url";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { SearchInput } from "@/components/ui/SearchInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SelectField } from "@/components/ui/SelectField";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { HoverCard } from "@/components/ui/HoverCard";
import { StatusDot, type StatusTone } from "@/components/ui/StatusDot";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { useToast } from "@/components/ui/toast-context";
import type { Repository } from "@/domain/models/repository";

type ViewMode = "grid" | "table" | "compact";
type SortMode = "name" | "updated" | "stars";
type PrivacyFilter = "all" | "private" | "public";
type RepoList = readonly Repository[];

const VIEW_OPTIONS = [
  { value: "grid", label: "Grid", icon: "grid" },
  { value: "table", label: "Table", icon: "rows" },
  { value: "compact", label: "Compact", icon: "list" },
] as const;

const SORT_OPTIONS = [
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Name" },
  { value: "stars", label: "Stars" },
] as const;

const PRIVACY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
] as const;

const HEALTH_TONE: Record<string, StatusTone> = { healthy: "success", attention: "warning", stale: "neutral" };

function RepoQuickActions({ repository }: { repository: Repository }) {
  const { toast } = useToast();
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const isFavorite = favorites.includes(repository.fullName);

  return (
    <DropdownMenu
      ariaLabel={`Actions for ${repository.fullName}`}
      items={[
        {
          id: "clone",
          label: "Copy clone URL",
          description: "HTTPS or SSH",
          icon: "copy",
          onSelect: () => {
            void navigator.clipboard.writeText(cloneUrl(repository));
            toast({ title: "Clone URL copied", description: cloneUrl(repository), tone: "success" });
          },
        },
        {
          id: "favorite",
          label: isFavorite ? "Remove favorite" : "Add favorite",
          icon: "star",
          onSelect: () => toggleFavorite(repository.fullName),
        },
        {
          id: "github",
          label: "Open on GitHub",
          icon: "external",
          onSelect: () => window.open(repository.url, "_blank", "noopener,noreferrer"),
        },
      ]}
      trigger={
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700"
        >
          <Icon name="more" size={14} />
        </span>
      }
    />
  );
}

function RepositoryPreview({ repository }: { repository: Repository }) {
  const health = repositoryHealth(repository);
  return (
    <div className="w-80 p-4">
      <div className="flex items-start gap-2.5">
        <Avatar name={repository.owner.login} src={repository.owner.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">{repository.fullName}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-2xs text-surface-400">
            <StatusDot tone={HEALTH_TONE[health.level] ?? "neutral"} label={health.label} />
            {health.label}
          </p>
        </div>
      </div>
      {repository.description ? (
        <p className="mt-2.5 line-clamp-3 text-xs text-surface-600 dark:text-surface-300">{repository.description}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-surface-500">
        {repository.language ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-400" />
            {repository.language}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1"><Icon name="star" size={11} /> {compactNumber(repository.stars)}</span>
        <span className="inline-flex items-center gap-1"><Icon name="gitFork" size={11} /> {compactNumber(repository.forks)}</span>
        <span className="inline-flex items-center gap-1"><Icon name="issue" size={11} /> {repository.openIssues}</span>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-surface-100 pt-2.5 text-2xs text-surface-400 dark:border-surface-700">
        <span>default: {repository.defaultBranch ?? "—"}</span>
        <span className="ml-auto">{repository.pushedAt ? `updated ${timeAgo(repository.pushedAt)}` : "never pushed"}</span>
      </div>
      <div className="mt-2.5 flex gap-2">
        <a
          href={repository.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-7 items-center gap-1 rounded-md border border-surface-200 px-2.5 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-700"
        >
          <Icon name="external" size={12} /> GitHub
        </a>
      </div>
    </div>
  );
}

function GridCard({ repository }: { repository: Repository }) {
  const health = repositoryHealth(repository);
  return (
    <HoverCard trigger={
      <Link to={repoWorkspacePathForFullName(repository.fullName)} className="group flex h-full flex-col rounded-xl border border-surface-200 bg-surface-0 p-4 shadow-card transition-all hover:border-accent-300 hover:shadow-pop dark:border-surface-600 dark:bg-surface-50 dark:hover:border-accent-700">
        <div className="flex items-start gap-2.5">
          <Avatar name={repository.owner.login} src={repository.owner.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-surface-900 group-hover:text-accent-700 dark:text-surface-100 dark:group-hover:text-accent-500">{repository.name}</p>
            <p className="truncate text-2xs text-surface-400">{repository.owner.login}</p>
          </div>
          <StatusDot tone={HEALTH_TONE[health.level] ?? "neutral"} label={health.label} />
        </div>
        {repository.description ? (
          <p className="mt-2.5 line-clamp-2 flex-1 text-xs text-surface-500">{repository.description}</p>
        ) : (
          <p className="flex-1" />
        )}
        <div className="mt-3 flex items-center gap-3 text-2xs text-surface-400">
          {repository.language ? (
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent-400" />{repository.language}</span>
          ) : null}
          <span className="inline-flex items-center gap-1"><Icon name="star" size={11} /> {compactNumber(repository.stars)}</span>
          <span className="inline-flex items-center gap-1"><Icon name="gitFork" size={11} /> {compactNumber(repository.forks)}</span>
          <span className="ml-auto">{repository.pushedAt ? timeAgo(repository.pushedAt) : "—"}</span>
        </div>
      </Link>
    } placement="right-start">
      <RepositoryPreview repository={repository} />
    </HoverCard>
  );
}

function TableRow({ repository }: { repository: Repository }) {
  const health = repositoryHealth(repository);
  return (
    <tr className="group border-b border-surface-100 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700/40">
      <td className="px-4 py-2.5">
        <Link to={repoWorkspacePathForFullName(repository.fullName)} className="flex items-center gap-2.5">
          <Icon name={repository.isPrivate ? "lock" : "repo"} size={14} className="text-surface-400" />
          <span className="max-w-56 truncate text-[13px] font-semibold text-surface-900 hover:text-accent-700 dark:text-surface-100 dark:hover:text-accent-500">{repository.fullName}</span>
          {repository.isPrivate ? <Badge>private</Badge> : null}
        </Link>
      </td>
      <td className="px-4 py-2.5">
        {repository.language ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-surface-500">
            <span className="h-2 w-2 rounded-full bg-accent-400" />{repository.language}
          </span>
        ) : <span className="text-xs text-surface-300">—</span>}
      </td>
      <td className="px-4 py-2.5 text-xs text-surface-500">
        <span className="inline-flex items-center gap-1"><Icon name="star" size={11} /> {compactNumber(repository.stars)}</span>
      </td>
      <td className="px-4 py-2.5 text-xs text-surface-500">
        <span className="inline-flex items-center gap-1"><Icon name="issue" size={11} /> {repository.openIssues}</span>
      </td>
      <td className="px-4 py-2.5 text-xs text-surface-500">
        <span className="inline-flex items-center gap-1.5">
          <StatusDot tone={HEALTH_TONE[health.level] ?? "neutral"} label={health.label} />
          {repository.pushedAt ? timeAgo(repository.pushedAt) : "—"}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className="inline-flex opacity-0 transition-opacity group-hover:opacity-100"><RepoQuickActions repository={repository} /></span>
      </td>
    </tr>
  );
}

function CompactRow({ repository }: { repository: Repository }) {
  const health = repositoryHealth(repository);
  return (
    <li>
      <HoverCard trigger={
        <Link
          to={repoWorkspacePathForFullName(repository.fullName)}
          className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-surface-50 dark:hover:bg-surface-700/40"
        >
          <Icon name={repository.isPrivate ? "lock" : "repo"} size={13} className="shrink-0 text-surface-400" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-surface-800 hover:text-accent-700 dark:text-surface-200 dark:hover:text-accent-500">{repository.fullName}</span>
          <StatusDot tone={HEALTH_TONE[health.level] ?? "neutral"} label={health.label} />
          {repository.language ? <span className="hidden text-2xs text-surface-400 sm:inline">{repository.language}</span> : null}
          <span className="hidden text-2xs text-surface-400 sm:inline">★ {compactNumber(repository.stars)}</span>
          <span className="text-2xs text-surface-400">{repository.pushedAt ? timeAgo(repository.pushedAt) : "—"}</span>
        </Link>
      } placement="right-start">
        <RepositoryPreview repository={repository} />
      </HoverCard>
    </li>
  );
}

export function RepositoryBrowserPage() {
  const account = useAuthStore((state) => state.account);
  const repositories = useRepositories(account !== null);
  const favorites = useFavoritesStore((state) => state.favorites);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortMode>("updated");
  const [privacy, setPrivacy] = useState<PrivacyFilter>("all");
  const [language, setLanguage] = useState("all");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [groupByOwner, setGroupByOwner] = useState(false);

  const search = useSearchRepositories(query, account !== null && query.trim().length > 0);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const results = useMemo<RepoList>(() => (
    query.trim().length > 0 && search.data ? search.data : (repositories.data ?? [])
  ), [query, search.data, repositories.data]);
  const isLoading = repositories.isLoading || (query.trim().length > 0 && search.isFetching);
  const error = repositories.error ?? search.error;

  const languages = useMemo(() => {
    const set = new Set<string>();
    for (const repo of results) {
      if (repo.language) set.add(repo.language);
    }
    return [...set].sort();
  }, [results]);

  const visible = useMemo(() => {
    let list = [...results];
    if (privacy === "private") list = list.filter((repo) => repo.isPrivate);
    if (privacy === "public") list = list.filter((repo) => !repo.isPrivate);
    if (language !== "all") list = list.filter((repo) => repo.language === language);
    if (showPinnedOnly) list = list.filter((repo) => repo.isPinned);
    if (showFavoritesOnly) list = list.filter((repo) => favorites.includes(repo.fullName));
    list.sort((a, b) => {
      if (sort === "name") return a.fullName.localeCompare(b.fullName);
      if (sort === "stars") return b.stars - a.stars;
      return (b.pushedAt ?? "").localeCompare(a.pushedAt ?? "");
    });
    return list;
  }, [results, privacy, language, showPinnedOnly, showFavoritesOnly, sort, favorites]);

  const grouped = useMemo(() => {
    if (!groupByOwner) return [{ owner: "", items: visible }];
    const byOwner = new Map<string, Repository[]>();
    for (const repo of visible) {
      const owner = repo.owner.login;
      const list = byOwner.get(owner) ?? [];
      list.push(repo);
      byOwner.set(owner, list);
    }
    return [...byOwner.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([owner, items]) => ({ owner, items }));
  }, [visible, groupByOwner]);

  const updateQuery = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      setSearchParams({ q: value }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-surface-900 dark:text-surface-100">Repositories</h1>
          <p className="text-sm text-surface-500">
            {results.length > 0 ? `${visible.length} of ${results.length} repositories` : "Browse, search, and pin repositories across your accounts."}
          </p>
        </div>
        <SegmentedControl
          ariaLabel="Repository view"
          options={VIEW_OPTIONS}
          value={view}
          onChange={setView}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2.5">
        <div className="w-full max-w-sm">
          <SearchInput
            value={query}
            onChange={updateQuery}
            placeholder="Search repositories…"
            ariaLabel="Search repositories"
          />
        </div>
        <SelectField
          label="Sort"
          aria-label="Sort repositories"
          options={SORT_OPTIONS}
          value={sort}
          onChange={(event) => setSort(event.target.value as SortMode)}
          className="w-40"
        />
        <SelectField
          label="Privacy"
          options={PRIVACY_OPTIONS}
          value={privacy}
          onChange={(event) => setPrivacy(event.target.value as PrivacyFilter)}
          className="w-32"
        />
        <SelectField
          label="Language"
          options={[{ value: "all", label: "All languages" }, ...languages.map((lang) => ({ value: lang, label: lang }))]}
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="w-40"
        />
        <div className="flex items-center gap-1.5 pb-0.5">
          <Button
            size="sm"
            variant={showPinnedOnly ? "secondary" : "ghost"}
            onClick={() => setShowPinnedOnly((value) => !value)}
          >
            <Icon name="pin" size={12} />
            Pinned
          </Button>
          <Button
            size="sm"
            variant={showFavoritesOnly ? "secondary" : "ghost"}
            onClick={() => setShowFavoritesOnly((value) => !value)}
          >
            <Icon name="star" size={12} />
            Favorites
          </Button>
          <Button
            size="sm"
            variant={groupByOwner ? "secondary" : "ghost"}
            onClick={() => setGroupByOwner((value) => !value)}
          >
            <Icon name="users" size={12} />
            Group by owner
          </Button>
        </div>
      </div>

      {isLoading ? (
        view === "grid" ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((index) => <Skeleton key={index} className="h-28 w-full" />)}
          </div>
        ) : (
          <Card><SkeletonList rows={5} /></Card>
        )
      ) : error ? (
        <ErrorState
          title="Could not load repositories"
          description={error instanceof Error ? error.message : "Check your token permissions and try again."}
          onRetry={() => { void repositories.refetch(); void search.refetch(); }}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No repositories found"
          description={
            showFavoritesOnly
              ? "You have not favorited any repositories yet. Use the ⋯ menu on a repository to favorite it."
              : showPinnedOnly
                ? "You have not pinned any repositories yet."
                : "Try different filters or connect an account with repositories."
          }
          action={showFavoritesOnly || showPinnedOnly ? (
            <Button size="sm" variant="secondary" onClick={() => { setShowFavoritesOnly(false); setShowPinnedOnly(false); }}>Clear filters</Button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(({ owner, items }) => (
            <section key={owner || "all"} aria-label={owner || "Repositories"}>
              {groupByOwner ? (
                <div className="mb-2 flex items-center gap-2">
                  {items[0] ? <Avatar name={owner} src={items[0].owner.avatarUrl} size="sm" /> : null}
                  <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">{owner || "Repositories"}</h2>
                  <span className="text-2xs text-surface-400">{items.length}</span>
                </div>
              ) : null}

              {view === "grid" ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((repo) => <GridCard key={repo.id} repository={repo} />)}
                </div>
              ) : view === "table" ? (
                <Card className="overflow-hidden">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-surface-200 text-2xs font-semibold tracking-wide text-surface-400 uppercase dark:border-surface-600">
                        <th scope="col" className="px-4 py-2">Repository</th>
                        <th scope="col" className="px-4 py-2">Language</th>
                        <th scope="col" className="px-4 py-2">Stars</th>
                        <th scope="col" className="px-4 py-2">Issues</th>
                        <th scope="col" className="px-4 py-2">Updated</th>
                        <th scope="col" className="px-4 py-2" aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((repo) => <TableRow key={repo.id} repository={repo} />)}
                    </tbody>
                  </table>
                </Card>
              ) : (
                <Card>
                  <ul className="divide-y divide-surface-100 dark:divide-surface-700">
                    {items.map((repo) => <CompactRow key={repo.id} repository={repo} />)}
                  </ul>
                </Card>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
