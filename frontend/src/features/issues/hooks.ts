import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { IssueComment } from "@/domain/models/issue";
import type { IssueUpdateInput } from "@/domain/ports/provider";
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

export function useIssueComments(fullName: string, number: number | null, enabled = true) {
  return useQuery({
    queryKey: ["repository", fullName, "issue", number, "comments"],
    queryFn: () => (number !== null ? githubProvider().listIssueComments(fullName, number) : Promise.resolve([] as IssueComment[])),
    enabled: enabled && fullName.length > 0 && number !== null,
    staleTime: 30_000,
  });
}

export function useUpdateIssue(fullName: string, number: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueUpdateInput) =>
      githubProvider().updateIssue(fullName, number, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName] });
    },
  });
}

export function useAddIssueComment(fullName: string, number: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => githubProvider().addIssueComment(fullName, number, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "issue", number, "comments"] });
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName, "issues"] });
    },
  });
}

export function useSetIssueLabels(fullName: string, number: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (labels: readonly string[]) => githubProvider().setIssueLabels(fullName, number, labels),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repository", fullName] });
    },
  });
}
