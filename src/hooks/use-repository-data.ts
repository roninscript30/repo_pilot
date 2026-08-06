import { useQuery } from "@tanstack/react-query";
import { providerRegistry } from "@/providers/registry";

function githubProvider() {
  return providerRegistry.githubProvider();
}

export function useBranches(fullName: string, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "branches"],
    queryFn: () => githubProvider().listBranches(fullName),
    enabled: enabled && fullName.length > 0,
    staleTime: 60_000,
  });
}

export function useCompareBranches(fullName: string, base: string, head: string, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "compare", base, head],
    queryFn: () => githubProvider().compareBranches(fullName, base, head),
    enabled: enabled && base.length > 0 && head.length > 0,
    staleTime: 30_000,
  });
}

export function useCommits(fullName: string, branch: string | null, limit = 50, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "commits", branch, limit],
    queryFn: () =>
      githubProvider().listCommits(
        fullName,
        branch !== null ? { branch, limit } : { limit },
      ),
    enabled: enabled && fullName.length > 0,
    staleTime: 30_000,
  });
}

export function useCommit(fullName: string, sha: string | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "commit", sha],
    queryFn: () => githubProvider().getCommit(fullName, sha ?? ""),
    enabled: enabled && sha !== null,
    staleTime: 60_000,
  });
}

export function useSearchCommits(fullName: string, query: string, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "search-commits", query],
    queryFn: () => githubProvider().searchCommits(fullName, query),
    enabled: enabled && query.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useTags(fullName: string, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "tags"],
    queryFn: () => githubProvider().listTags(fullName),
    enabled: enabled && fullName.length > 0,
    staleTime: 60_000,
  });
}

export function useWorkflowRuns(fullName: string, limit = 10, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "workflow-runs", limit],
    queryFn: () => githubProvider().listWorkflowRuns(fullName, limit),
    enabled: enabled && fullName.length > 0,
    staleTime: 60_000,
  });
}

export function useCheckRuns(fullName: string, ref: string | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "check-runs", ref],
    queryFn: () => githubProvider().getCheckRuns(fullName, ref ?? ""),
    enabled: enabled && ref !== null,
    staleTime: 60_000,
  });
}

export function useCommitActivity(fullName: string, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "commit-activity"],
    queryFn: () => githubProvider().getCommitActivity(fullName),
    enabled: enabled && fullName.length > 0,
    staleTime: 5 * 60_000,
  });
}

export function useRepositoryTree(fullName: string, branch: string | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "tree", branch],
    queryFn: () => githubProvider().getRepositoryTree(fullName, branch ?? ""),
    enabled: enabled && fullName.length > 0 && branch !== null,
    staleTime: 60_000,
  });
}

export function useFileContents(fullName: string, path: string | null, ref?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "file", path, ref],
    queryFn: () => githubProvider().getFileContents(fullName, path ?? "", ref ?? undefined),
    enabled: enabled && fullName.length > 0 && path !== null,
    staleTime: 60_000,
  });
}
