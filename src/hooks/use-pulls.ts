import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PullRequest } from "@/domain/models/pull-request";
import { providerRegistry } from "@/providers/registry";

function githubProvider() {
  return providerRegistry.githubProvider();
}

export function usePullRequests(fullName: string, state: "open" | "closed" | "all", enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "pulls", state],
    queryFn: () => githubProvider().listPullRequests(fullName, { state, limit: 30 }),
    enabled: enabled && fullName.length > 0,
    staleTime: 30_000,
  });
}

export function usePullRequestDetail(fullName: string, number: number | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "pull", number],
    queryFn: async () => {
      if (number === null) return null;
      const [pull, commits, files, reviews] = await Promise.all([
        githubProvider().getPullRequest(fullName, number),
        githubProvider().listPullRequestCommits(fullName, number),
        githubProvider().listPullRequestFiles(fullName, number),
        githubProvider().listPullRequestReviews(fullName, number),
      ]);
      return { pull, commits, files, reviews };
    },
    enabled: enabled && fullName.length > 0 && number !== null,
    staleTime: 30_000,
  });
}

export function usePullRequestFiles(fullName: string, number: number | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "pull", number, "files"],
    queryFn: () => (number !== null ? githubProvider().listPullRequestFiles(fullName, number) : Promise.resolve([])),
    enabled: enabled && fullName.length > 0 && number !== null,
    staleTime: 30_000,
  });
}

export function usePullRequestCommits(fullName: string, number: number | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "pull", number, "commits"],
    queryFn: () => (number !== null ? githubProvider().listPullRequestCommits(fullName, number) : Promise.resolve([])),
    enabled: enabled && fullName.length > 0 && number !== null,
    staleTime: 30_000,
  });
}

export function usePullRequestReviews(fullName: string, number: number | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "pull", number, "reviews"],
    queryFn: () => (number !== null ? githubProvider().listPullRequestReviews(fullName, number) : Promise.resolve([])),
    enabled: enabled && fullName.length > 0 && number !== null,
    staleTime: 30_000,
  });
}

export function useRefreshPullRequest() {
  const queryClient = useQueryClient();
  return (fullName: string, number: number | null) => {
    void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "pulls"] });
    void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "pull", number] });
  };
}

export type { PullRequest };
