import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { providerRegistry } from "@/providers/registry";

function githubProvider() {
  return providerRegistry.githubProvider();
}

export type PullRequestFilter = "open" | "closed" | "merged" | "all";

export function usePullRequests(fullName: string, state: PullRequestFilter, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "pulls", state],
    queryFn: () =>
      githubProvider().listPullRequests(fullName, {
        state: state === "merged" ? "closed" : state,
        limit: 30,
      }),
    enabled: enabled && fullName.length > 0,
    staleTime: 30_000,
  });
}

export function usePullRequest(fullName: string, number: number | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "pull", number],
    queryFn: () => githubProvider().getPullRequest(fullName, number ?? 0),
    enabled: enabled && number !== null && fullName.length > 0,
    staleTime: 30_000,
  });
}

export function usePullRequestCommits(fullName: string, number: number | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "pull", number, "commits"],
    queryFn: () => githubProvider().listPullRequestCommits(fullName, number ?? 0),
    enabled: enabled && number !== null && fullName.length > 0,
    staleTime: 60_000,
  });
}

export function usePullRequestFiles(fullName: string, number: number | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "pull", number, "files"],
    queryFn: () => githubProvider().listPullRequestFiles(fullName, number ?? 0),
    enabled: enabled && number !== null && fullName.length > 0,
    staleTime: 60_000,
  });
}

export function usePullRequestReviews(fullName: string, number: number | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "pull", number, "reviews"],
    queryFn: () => githubProvider().listPullRequestReviews(fullName, number ?? 0),
    enabled: enabled && number !== null && fullName.length > 0,
    staleTime: 60_000,
  });
}

export function useIssues(fullName: string, state: "open" | "closed" | "all", enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "issues", state],
    queryFn: () => githubProvider().listIssues(fullName, { state, limit: 50 }),
    enabled: enabled && fullName.length > 0,
    staleTime: 30_000,
  });
}

export function useIssue(fullName: string, number: number | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "issue", number],
    queryFn: () => githubProvider().getIssue(fullName, number ?? 0),
    enabled: enabled && number !== null && fullName.length > 0,
    staleTime: 30_000,
  });
}

export function useIssueComments(fullName: string, number: number | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "issue", number, "comments"],
    queryFn: () => githubProvider().listIssueComments(fullName, number ?? 0),
    enabled: enabled && number !== null && fullName.length > 0,
    staleTime: 60_000,
  });
}

export function useCreateIssue(fullName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { readonly title: string; readonly body?: string }) =>
      githubProvider().createIssue(fullName, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repository", fullName, "issues"] });
    },
  });
}

export function useSearchIssues(fullName: string, query: string, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "search-issues", query],
    queryFn: () => githubProvider().searchIssues(fullName, query),
    enabled: enabled && query.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useSearchPullRequests(fullName: string, query: string, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "search-pulls", query],
    queryFn: () => githubProvider().searchPullRequests(fullName, query),
    enabled: enabled && query.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useReleases(fullName: string, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "releases"],
    queryFn: () => githubProvider().listReleases(fullName, 30),
    enabled: enabled && fullName.length > 0,
    staleTime: 60_000,
  });
}
