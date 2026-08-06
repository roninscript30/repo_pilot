import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CommandDialog, type CommandItem } from "@/components/ui/CommandDialog";
import { useUiStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useRepositories, useSearchRepositories } from "@/hooks/use-repositories";
import { useSearchCommits } from "@/hooks/use-repository-data";
import { useSearchIssues, useSearchPullRequests } from "@/hooks/use-collaboration";
import { shortSha } from "@/domain/models/commit";
import { repositoryNameFromPath } from "@/lib/route";
import { recordRecentSearch } from "@/services/recent-searches";

/**
 * Global search (⌘P). Searches repositories, and — when a repository
 * workspace is open — also commits, issues, and pull requests in it.
 */
export function GlobalSearch() {
  const open = useUiStore((state) => state.searchOpen);
  const setOpen = useUiStore((state) => state.setSearchOpen);
  const account = useAuthStore((state) => state.account);
  const navigate = useNavigate();
  const location = useLocation();
  const fullName = repositoryNameFromPath(location.pathname);

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setDebounced("");
    }
  }, [open]);

  const repositories = useRepositories(account !== null);
  const repoSearch = useSearchRepositories(debounced, debounced.length > 0);
  const commitSearch = useSearchCommits(fullName, debounced, open && fullName.length > 0 && debounced.length > 0);
  const issueSearch = useSearchIssues(fullName, debounced, open && fullName.length > 0 && debounced.length > 0);
  const pullSearch = useSearchPullRequests(fullName, debounced, open && fullName.length > 0 && debounced.length > 0);

  const isSearching = debounced.length > 0 && (repoSearch.isFetching || commitSearch.isFetching || issueSearch.isFetching || pullSearch.isFetching);

  const items = useMemo<readonly CommandItem[]>(() => {
    const results: CommandItem[] = [];

    if (debounced.length === 0) {
      for (const repository of (repositories.data ?? []).slice(0, 10)) {
        results.push({
          id: `repo-${repository.fullName}`,
          label: repository.fullName,
          description: repository.description ?? repository.language ?? "Repository",
          icon: repository.isPrivate ? "lock" : "repo",
          group: "Repositories",
          hint: repository.isPrivate ? "private" : "public",
          onSelect: () => navigate(`/repositories/${repository.fullName}`),
        });
      }
      return results;
    }

    for (const repository of repoSearch.data ?? []) {
      results.push({
        id: `repo-${repository.fullName}`,
        label: repository.fullName,
        description: repository.description ?? "Repository",
        icon: repository.isPrivate ? "lock" : "repo",
        group: "Repositories",
        onSelect: () => navigate(`/repositories/${repository.fullName}`),
      });
    }

    for (const commit of commitSearch.data ?? []) {
      results.push({
        id: `commit-${commit.sha}`,
        label: commit.subject,
        description: `${shortSha(commit.sha)} · ${commit.author.name ?? "unknown"}`,
        icon: "gitCommit",
        group: "Commits",
        onSelect: () => navigate(`/repositories/${fullName}/commits?sha=${commit.sha}`),
      });
    }

    for (const issue of issueSearch.data ?? []) {
      results.push({
        id: `issue-${issue.number}`,
        label: issue.title,
        description: `#${issue.number} · ${issue.author.login}`,
        icon: "issue",
        group: "Issues",
        onSelect: () => navigate(`/repositories/${fullName}/issues/${issue.number}`),
      });
    }

    for (const pull of pullSearch.data ?? []) {
      results.push({
        id: `pr-${pull.number}`,
        label: pull.title,
        description: `#${pull.number} · ${pull.author.login}`,
        icon: "gitMerge",
        group: "Pull requests",
        onSelect: () => navigate(`/repositories/${fullName}/pulls/${pull.number}`),
      });
    }

    return results;
  }, [debounced, repositories.data, repoSearch.data, commitSearch.data, issueSearch.data, pullSearch.data, fullName, navigate]);

  return (
    <CommandDialog
      open={open}
      onClose={() => setOpen(false)}
      title="Global search"
      placeholder={fullName ? `Search ${fullName} (repos, commits, issues, PRs)…` : "Search repositories…"}
      items={items}
      filterDisabled
      loading={isSearching}
      onSelect={(query) => recordRecentSearch(query)}
    />
  );
}
