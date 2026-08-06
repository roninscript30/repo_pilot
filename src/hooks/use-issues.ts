import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { providerRegistry } from "@/providers/registry";

function githubProvider() {
  return providerRegistry.githubProvider();
}

export function useIssues(fullName: string, state: "open" | "closed" | "all", enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "issues", state],
    queryFn: () => githubProvider().listIssues(fullName, { state, limit: 30 }),
    enabled: enabled && fullName.length > 0,
    staleTime: 30_000,
  });
}

export function useCreateIssue(fullName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { readonly title: string; readonly body?: string }) =>
      githubProvider().createIssue(fullName, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "issues"] });
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "overview"] });
    },
  });
}
