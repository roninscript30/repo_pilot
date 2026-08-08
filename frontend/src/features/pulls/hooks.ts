import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PullRequest } from "@/domain/models/pull-request";
import type { PullRequestCreateInput, PullRequestMergeInput, PullRequestReviewInput, PullRequestUpdateInput } from "@/domain/ports/provider";
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

export function useRemoteBranches(fullName: string, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "branches"],
    queryFn: () => githubProvider().listBranches(fullName),
    enabled: enabled && fullName.length > 0,
    staleTime: 60_000,
  });
}

export function useCreatePullRequest(fullName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PullRequestCreateInput) =>
      githubProvider().createPullRequest(fullName, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "pulls"] });
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "overview"] });
    },
  });
}

export function useUpdatePullRequest(fullName: string, number: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PullRequestUpdateInput) =>
      githubProvider().updatePullRequest(fullName, number, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "pull", number] });
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "pulls"] });
    },
  });
}

export function useMergePullRequest(fullName: string, number: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PullRequestMergeInput) =>
      githubProvider().mergePullRequest(fullName, number, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "pull", number] });
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "pulls"] });
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "overview"] });
    },
  });
}

export function useSubmitPullRequestReview(fullName: string, number: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PullRequestReviewInput) =>
      githubProvider().submitPullRequestReview(fullName, number, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "pull", number] });
    },
  });
}

export function usePullRequestAction(fullName: string, number: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, body }: { kind: "comment" | "review"; body: string }) => {
      if (kind === "comment") {
        await githubProvider().addIssueComment(fullName, number, body);
      } else {
        await githubProvider().submitPullRequestReview(fullName, number, { body, event: "comment" });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "pull", number] });
    },
  });
}
