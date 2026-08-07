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

export function useFileTree(fullName: string, branch: string, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "tree", branch],
    queryFn: () => githubProvider().getRepositoryTree(fullName, branch),
    enabled: enabled && fullName.length > 0 && branch.length > 0,
    staleTime: 60_000,
  });
}

export function useFileContent(fullName: string, path: string | null, ref: string, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "content", ref, path],
    queryFn: () => (path ? githubProvider().getFileContents(fullName, path, ref) : Promise.resolve(null)),
    enabled: enabled && fullName.length > 0 && path !== null && path.length > 0,
    staleTime: 60_000,
  });
}
