import { useQuery } from "@tanstack/react-query";
import { providerRegistry } from "@/providers/registry";

function githubProvider() {
  return providerRegistry.githubProvider();
}

export function useCommits(fullName: string, branch: string | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "commits", branch],
    queryFn: () => githubProvider().listCommits(fullName, branch ? { branch, limit: 50 } : { limit: 50 }),
    enabled: enabled && fullName.length > 0,
    staleTime: 30_000,
  });
}

export function useCommitDetail(fullName: string, sha: string | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "commit", sha],
    queryFn: () => (sha ? githubProvider().getCommit(fullName, sha) : Promise.resolve(null)),
    enabled: enabled && fullName.length > 0 && sha !== null,
    staleTime: 60_000,
  });
}
