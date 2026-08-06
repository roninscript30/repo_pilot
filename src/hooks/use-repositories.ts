import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Repository } from "@/domain/models/repository";
import { toggleRepositoryPin } from "@/services/repository-pins";
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
