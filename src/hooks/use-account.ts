import { useQuery } from "@tanstack/react-query";
import { providerRegistry } from "@/providers/registry";

function githubProvider() {
  return providerRegistry.githubProvider();
}

export function useNotifications(limit = 30, enabled = true) {
  return useQuery({
    queryKey: ["notifications", limit],
    queryFn: () => githubProvider().listNotifications(limit),
    enabled,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useOrganizations(enabled = true) {
  return useQuery({
    queryKey: ["account", "organizations"],
    queryFn: () => githubProvider().listOrganizations(50),
    enabled,
    staleTime: 5 * 60_000,
  });
}
