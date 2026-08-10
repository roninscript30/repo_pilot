import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Repository } from "@/domain/models/repository";
import {
  getPinnedRepositoryNames,
  toggleRepositoryPin,
} from "@/features/repositories/services/repository-pins";
import { providerRegistry } from "@/providers/registry";

const REPOSITORIES_KEY = ["repositories"] as const;
const OVERVIEW_PREFIX = ["repository", "overview"] as const;

function githubProvider() {
  return providerRegistry.githubProvider();
}

export function useRepositories(enabled = true) {
  return useQuery({
    queryKey: [...REPOSITORIES_KEY],
    queryFn: () => githubProvider().listRepositories({ limit: 50 }),
    enabled,
    staleTime: 30_000,
  });
}

/** Repositories the active account has starred (repo source). */
export function useStarredRepositories(enabled = true) {
  return useQuery({
    queryKey: [...REPOSITORIES_KEY, "starred"],
    queryFn: () => githubProvider().listStarredRepositories(30),
    enabled,
    staleTime: 30_000,
  });
}

/** Repositories the active account can see, ordered by most recent update. */
export function useRecentRepositories(enabled = true) {
  return useQuery({
    queryKey: [...REPOSITORIES_KEY, "recent"],
    queryFn: () => githubProvider().listRecentRepositories(30),
    enabled,
    staleTime: 30_000,
  });
}

/** Repositories in one organization, as visible to the token. */
export function useOrgRepositories(org: string, enabled = true) {
  return useQuery({
    queryKey: [...REPOSITORIES_KEY, "org", org],
    queryFn: () => githubProvider().listOrganizationRepositories(org, 50),
    enabled: enabled && org.length > 0,
    staleTime: 30_000,
  });
}

/**
 * Resolve pinned repository names (localStorage, ADR-0005) into full
 * Repository objects so "pinned" can be browsed as its own source.
 *
 * Pin names are read fresh from localStorage on every render so a pin
 * toggle is reflected as soon as the page re-renders; the per-repo query
 * keys are a prefix of `REPOSITORIES_KEY`, so `useToggleRepositoryPin`
 * invalidates them along with the rest of the repository cache.
 */
export function usePinnedRepositories(enabled = true) {
  const names = enabled ? getPinnedRepositoryNames() : [];
  const queries = useQueries({
    queries: names.map((fullName) => ({
      queryKey: [...REPOSITORIES_KEY, "pinned", fullName],
      queryFn: () => githubProvider().getRepository(fullName),
      staleTime: 60_000,
      retry: 0,
    })),
  });
  return {
    data: queries
      .map((query) => query.data)
      .filter((repository): repository is Repository => repository !== undefined),
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
  };
}

export function useSearchRepositories(query: string, enabled = true) {
  return useQuery({
    queryKey: [...REPOSITORIES_KEY, "search", query],
    queryFn: () => githubProvider().searchRepositories({ query, limit: 30 }),
    enabled: enabled && query.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useRepositoryOverview(fullName: string, enabled = true) {
  return useQuery({
    queryKey: [...OVERVIEW_PREFIX, fullName],
    queryFn: () => githubProvider().getRepositoryOverview(fullName),
    enabled,
    staleTime: 60_000,
  });
}

export function useToggleRepositoryPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (repository: Repository) => {
      const reversed = repository.isPinned;
      toggleRepositoryPin(repository.fullName);
      return { repository, pinned: !reversed };
    },
    onSuccess: ({ repository }) => {
      queryClient.invalidateQueries({ queryKey: [repository.providerId, "repos"] });
      queryClient.invalidateQueries({ queryKey: [...REPOSITORIES_KEY] });
      queryClient.invalidateQueries({ queryKey: [...OVERVIEW_PREFIX, repository.fullName] });
    },
  });
}

/** Group repositories into pinned and others, preserving order. */
export function partitionByPins(repositories: readonly Repository[] | undefined) {
  const pinned: Repository[] = [];
  const others: Repository[] = [];
  for (const repository of repositories ?? []) {
    if (repository.isPinned) {
      pinned.push(repository);
    } else {
      others.push(repository);
    }
  }
  return { pinned, others };
}
