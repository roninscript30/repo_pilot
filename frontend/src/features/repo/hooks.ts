import { useQuery } from "@tanstack/react-query";
import { providerRegistry } from "@/providers/registry";

function githubProvider() {
  return providerRegistry.githubProvider();
}

/** Repository activity feed for the repo workspace. */
export function useRepositoryActivity(fullName: string, limit = 30, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "activity", limit],
    queryFn: () => githubProvider().listRepositoryActivity(fullName, limit),
    enabled: enabled && fullName.length > 0,
    staleTime: 60_000,
  });
}
