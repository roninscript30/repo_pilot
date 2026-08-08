import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UnlistenFn } from "@tauri-apps/api/event";
import type { Branch } from "@/domain/models/branch";
import type { CommitDetail, CommitSummary } from "@/domain/models/commit";
import type { FileDiff, MergePreview, RefComparison, SyncLog, TagInfo } from "@/domain/models/git";
import type { CloneInput, FileDiffSpec, GitOperation } from "@/domain/ports/git-runtime";
import { providerRegistry } from "@/providers/registry";
import { onGitProgress, onRepoChanged, type GitProgressEvent } from "@/services/git-events";
import { isTauriRuntime, resolveGitRuntime } from "@/services/runtime";
import { invoke } from "@tauri-apps/api/core";

function githubProvider() {
  return providerRegistry.githubProvider();
}

// ---------------------------------------------------------------------------
// Remote (provider) history used by the commit explorer and compare views.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Local (GitRuntime) data: working tree, branches, compares, sync.
// ---------------------------------------------------------------------------

const LOCAL_PREFIX = ["local"] as const;

const LOCAL_KEYS = {
  worktree: (path: string) => [...LOCAL_PREFIX, "worktree", path] as const,
  branches: (path: string) => [...LOCAL_PREFIX, "branches", path] as const,
  commits: (path: string, branch: string | null, limit: number) =>
    [...LOCAL_PREFIX, "commits", path, branch, limit] as const,
  commit: (path: string, sha: string) => [...LOCAL_PREFIX, "commit", path, sha] as const,
  compare: (path: string, base: string, target: string) =>
    [...LOCAL_PREFIX, "compare", path, base, target] as const,
  mergePreview: (path: string, head: string, target: string) =>
    [...LOCAL_PREFIX, "merge-preview", path, head, target] as const,
  syncLog: (path: string) => [...LOCAL_PREFIX, "sync-log", path] as const,
  diffFiles: (path: string, base: string, target: string) =>
    [...LOCAL_PREFIX, "diff-files", path, base, target] as const,
  tags: (path: string) => [...LOCAL_PREFIX, "tags", path] as const,
};

export function useLocalWorktree(path: string | null, enabled = true) {
  return useQuery({
    queryKey: LOCAL_KEYS.worktree(path ?? ""),
    queryFn: () => resolveGitRuntime().getWorktreeStatus(path as string),
    enabled: enabled && path !== null && path.length > 0,
    refetchInterval: 15_000,
  });
}

export function useLocalBranches(path: string | null, enabled = true) {
  return useQuery({
    queryKey: LOCAL_KEYS.branches(path ?? ""),
    queryFn: () => resolveGitRuntime().listBranches(path as string),
    enabled: enabled && path !== null && path.length > 0,
    staleTime: 15_000,
  });
}

export function useLocalCommits(path: string | null, branch: string | null, limit = 50, enabled = true) {
  return useQuery({
    queryKey: LOCAL_KEYS.commits(path ?? "", branch, limit),
    queryFn: () => resolveGitRuntime().listCommits(path as string, branch ?? undefined, limit),
    enabled: enabled && path !== null && path.length > 0,
    staleTime: 30_000,
  });
}

export function useLocalCommitDetail(path: string | null, sha: string | null, enabled = true) {
  return useQuery({
    queryKey: LOCAL_KEYS.commit(path ?? "", sha ?? ""),
    queryFn: () => resolveGitRuntime().getCommit(path as string, sha as string),
    enabled: enabled && path !== null && sha !== null && path.length > 0 && sha.length > 0,
    staleTime: 60_000,
  });
}

export function useFileDiff(path: string | null, spec: FileDiffSpec | null, enabled = true) {
  return useQuery({
    queryKey: [...LOCAL_PREFIX, "file-diff", path ?? "", spec?.base, spec?.target, spec?.path],
    queryFn: () => resolveGitRuntime().getFileDiff(path as string, spec as FileDiffSpec),
    enabled: enabled && path !== null && spec !== null && path.length > 0,
    staleTime: 10_000,
  });
}

/** Per-file diffs between any two refs (branches/tags/SHAs). */
export function useDiffFiles(
  path: string | null,
  baseRef: string | null,
  targetRef: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: LOCAL_KEYS.diffFiles(path ?? "", baseRef ?? "", targetRef ?? ""),
    queryFn: () => resolveGitRuntime().diffFiles(path as string, baseRef as string, targetRef as string),
    enabled: enabled && path !== null && baseRef !== null && targetRef !== null && path.length > 0,
    staleTime: 15_000,
  });
}

/** Local tags for the compare source/target pickers. */
export function useLocalTags(path: string | null, enabled = true) {
  return useQuery({
    queryKey: LOCAL_KEYS.tags(path ?? ""),
    queryFn: () => resolveGitRuntime().listLocalTags(path as string),
    enabled: enabled && path !== null && path.length > 0,
    staleTime: 30_000,
  });
}

export function useRefComparison(
  path: string | null,
  baseRef: string | null,
  targetRef: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: LOCAL_KEYS.compare(path ?? "", baseRef ?? "", targetRef ?? ""),
    queryFn: () => resolveGitRuntime().compareRefs(path as string, baseRef as string, targetRef as string),
    enabled: enabled && path !== null && baseRef !== null && targetRef !== null,
    staleTime: 15_000,
  });
}

export function useMergePreview(
  path: string | null,
  headRef: string | null,
  targetRef: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: LOCAL_KEYS.mergePreview(path ?? "", headRef ?? "", targetRef ?? ""),
    queryFn: () => resolveGitRuntime().mergePreview(path as string, headRef as string, targetRef as string),
    enabled: enabled && path !== null && headRef !== null && targetRef !== null,
    staleTime: 15_000,
  });
}

export function useSyncLog(path: string | null, enabled = true) {
  return useQuery({
    queryKey: LOCAL_KEYS.syncLog(path ?? ""),
    queryFn: () => resolveGitRuntime().getSyncLog(path as string),
    enabled: enabled && path !== null && path.length > 0,
    staleTime: 30_000,
  });
}

/**
 * Execute a local Git operation and invalidate everything derived from
 * the repository so every workspace surface refreshes together.
 */
export function useRunGitOperation(path: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { readonly operation: GitOperation; readonly payload?: Record<string, unknown> }) =>
      resolveGitRuntime().run(input.operation, path as string, input.payload),
    onSuccess: () => {
      if (!path) return;
      void queryClient.invalidateQueries({ queryKey: LOCAL_KEYS.worktree(path) });
      void queryClient.invalidateQueries({ queryKey: LOCAL_KEYS.branches(path) });
      void queryClient.invalidateQueries({ queryKey: [...LOCAL_PREFIX, "commits", path] });
      void queryClient.invalidateQueries({ queryKey: [...LOCAL_PREFIX, "commit", path] });
      void queryClient.invalidateQueries({ queryKey: [...LOCAL_PREFIX, "compare", path] });
      void queryClient.invalidateQueries({ queryKey: [...LOCAL_PREFIX, "merge-preview", path] });
    },
  });
}

/**
 * Latest progress event for a backend network operation, or null when no
 * progress has arrived. Pass the same `operationId` used by the mutation.
 */
export function useGitProgress(operationId: string | null) {
  const [progress, setProgress] = useState<GitProgressEvent | null>(null);
  useEffect(() => {
    if (!operationId) return;
    let unlisten: UnlistenFn | null = null;
    let cancelled = false;
    void (async () => {
      const un = await onGitProgress((event) => {
        if (event.operationId === operationId) setProgress(event);
      });
      if (cancelled) un?.();
      else unlisten = un;
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [operationId]);
  return progress;
}

/**
 * Keep a local repository's queries fresh: registers the path with the
 * backend file watcher and invalidates all `["local", ...]` queries when a
 * `git://repo-changed` event for the path arrives.
 */
export function useRepoChanged(path: string | null, onChanged?: () => void) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!path) return;
    let unlisten: UnlistenFn | null = null;
    let cancelled = false;
    if (isTauriRuntime()) {
      // Register with the backend watcher (idempotent by path).
      void invoke("git_watch_paths", { paths: [path] }).catch(() => undefined);
    }
    void (async () => {
      const un = await onRepoChanged((event) => {
        if (event.path !== path) return;
        void queryClient.invalidateQueries({ queryKey: ["local"] });
        onChanged?.();
      });
      if (cancelled) un?.();
      else unlisten = un;
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [path, onChanged, queryClient]);
}

/** System-git availability (desktop) / absence (browser preview). */
export function useGitVersion() {
  return useQuery({
    queryKey: [...LOCAL_PREFIX, "git-version"],
    queryFn: () => resolveGitRuntime().getGitVersion(),
    staleTime: 60_000,
  });
}

/** Clone a repository into a folder; invalidates local queries on success. */
export function useCloneRepository() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CloneInput) => resolveGitRuntime().cloneRepository(input),
    onSuccess: (outcome) => {
      if (outcome.ok) {
        void queryClient.invalidateQueries({ queryKey: ["local"] });
      }
    },
  });
}

export type { Branch, CommitDetail, CommitSummary, FileDiff, MergePreview, RefComparison, SyncLog, TagInfo };
