# ADR-0014: Commit Graph and Git Events Command Surface

Status: Accepted
Date: 2026-08-07

## Context

Slice 2 needs (a) the full commit DAG — not the first-parent walk used by `git_list_commits` — so the interactive branch graph (Slice 5) can render lanes, merges, and refs; and (b) live repo state changes so the worktree/commit/sync views stop polling. The existing `CommitSummary` in the TS model already requires `parents`, but the Rust `commit_to_summary` only walked first-parent and did not serialize refs.

## Decision

1. **New `git_commit_graph` command returning the full DAG.**
   - Args: `GitCommitGraphArgs { path, limit: Option<usize> }` (limit defaults to 2000 nodes).
   - Response: `CommitGraph { head_ref: Option<String>, nodes: Vec<GraphNode> }` where
     `GraphNode { id, parents: Vec<String>, refs: Vec<GraphRef>, subject, author_name, author_email, time: i64 /*unix seconds*/, is_merge }` and `GraphRef { name, kind }` with kind `"branch" | "remote" | "tag" | "head"`.
   - Tips are collected from `refs/heads`, `refs/remotes`, `refs/tags`, and HEAD (deduped); the walk uses `repo.rev_walk(tips).all()`. Parents come from `commit.parent_ids()`. `is_merge` is `parents.len() > 1`. Refs are mapped id → `Vec<GraphRef>` by iterating `repo.references()?.all()?` once (peeling each with `peel_to_id_in_place`).
   - The frontend builds `CommitSummary[]` from nodes (time → ISO) and reuses `lib/commit-graph.ts` lane assignment; refs render as colored pills.
2. **Git progress and repo-changed events.**
   - Backend emits `git://progress` `{ operationId, phase, percent: Option<u32>, text }` while clone/fetch/pull/push run (ADR-0013), and `git://repo-changed` `{ path }` after any mutation (every successful write op in `git_run_operation`, successful clone, and file-watch hits).
   - File watching uses the `notify` crate (version 6, matched to `notify-debouncer-mini` 0.4): `git_watch_paths(paths)` maintains a backend registry (`Mutex<WatchRegistry>` with a single `Debouncer<RecommendedWatcher>` and a `HashSet<PathBuf>` of watched paths) and emits `repo-changed` on debounced events.
   - Frontend `services/git-events.ts` exposes `onGitProgress(handler)` / `onRepoChanged(handler)` (both null outside the Tauri shell) plus `useGitProgress(operationId)`, `useRepoChanged(path)`, `useGitVersion()`, `useCloneRepository()` hooks. `useRepoChanged` invalidates the `["local", path]` React Query scope; `refetchInterval` stays as a safety net.
3. **camelCase arg/response marshalling** (serde `rename_all`) matches the TS contract, same as every other command (ADR-0011).

## Rationale

- A dedicated graph command keeps `git_list_commits`'s first-parent paginated walk (right for the commits list) separate from the branch graph's full-DAG needs (right for Slice 5).
- Events push changes to the UI instead of relying on polling; the refetchInterval safety net keeps browser-preview behavior honest (web-fallback runtime still returns empty/unavailable data).
- Emitting events from the backend means every mutation path — gix, system-git, and file-watch — funnels through one `emit_repo_changed` helper, so no caller can forget to invalidate.

## Alternatives Considered

- **Extending `git_list_commits` with a `full: true` mode**: couples two different walk semantics (paginated first-parent vs capped full DAG) in one command. Rejected; a distinct command has a distinct contract.
- **Frontend computes the graph from commit lists**: impossible without every parent pointer at depth, which is exactly what the backend owns. Rejected.
- **`tokio` fs watch / polling from the frontend**: duplicates the backend's knowledge of what changed and where. Rejected in favor of `notify` in the backend.

## Consequences

- `git://repo-changed` fires on both mutations and file-system changes, so a `useRepoChanged` subscriber may invalidate more often than strictly necessary (debounced, so bounded). This is the desired default for correctness.
- Browser preview never subscribes (events only exist in the Tauri shell); its local views keep using refetchInterval fallback.
- The `git_commit_graph` payload is bounded at ~2000 nodes to keep the DAG walk and the frontend lane layout cheap on very large repos.

## Follow-ups

- Structured diff (`DiffHunk`/`DiffLine`) and `git_diff_files(path, baseRef, targetRef)` command surface — Slice 4.
- Graph query filters (path isolation, author, since) for the Slice 5 toolbar.
