import { useQuery } from "@tanstack/react-query";
import { providerRegistry } from "@/providers/registry";

function githubProvider() {
  return providerRegistry.githubProvider();
}

export function useReleases(fullName: string, limit = 20, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "releases"],
    queryFn: () => githubProvider().listReleases(fullName, limit),
    enabled: enabled && fullName.length > 0,
    staleTime: 60_000,
  });
}
