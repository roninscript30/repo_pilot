# ADR-0013: System Git for Network Operations and Complex Write Operations

Status: Accepted
Date: 2026-08-07

## Context

Phase 1.5 requires every Git operation to execute locally, including clone/fetch/pull/push and complex write operations (stash, cherry-pick, revert, rebase, merge, reset --hard, checkout). The Rust shell is pinned to gix 0.68.0 (ADR-0003). Verified during Slice 2 planning: gix 0.68's transport stack is not compiled in this build — network via gitoxide is a non-starter. The same gix version also does not expose first-class APIs for stash, cherry-pick, revert, or interactive rebase. Doing network and these write operations in gix would mean either reimplementing Git semantics or pulling in a different, unproven path.

## Decision

1. **Spawn the system `git` binary** (`std::process::Command`, no shell) for:
   - **Network operations**: clone, fetch, pull, push.
   - **Complex write operations**: stash (push/pop/list/drop), cherry-pick, revert, rebase, merge, squash-merge, reset `--mixed`/`--hard`, checkout (`-b`/start-point), restore, branch create/delete/rename with start points, tag create/delete, and `--amend`/`--allow-empty`/`--signed` commit paths.
2. **gix 0.68 stays for reads and simple index ops**: worktree status, list branches, list commits, commit graph, get commit, file diff, compare refs, merge preview, sync log, and plain stage/unstage/commit.
3. **Auth stays in Rust and never touches argv.**
   - `GIT_TERMINAL_PROMPT=0` and `credential.interactive=never` disable any interactive credential prompt (a hung clone is worse than a failed one).
   - `-c credential.helper=` clears configured helpers so the OS keyring (or anything else) cannot inject a wrong credential.
   - The account token is read from the OS keyring inside Rust (`resolve_token`, keyed by `credential_key(account_login)`) and injected via `-c http.extraHeader=Authorization: Bearer <token>`. `http.extraHeader` is never written to argv in a way that leaks into process listings and is scoped per invocation.
4. **Blocking work stays off the async executor.** `run_system_git` wraps the child in `tauri::async_runtime::spawn_blocking` and reads stdout/stderr on dedicated threads, so long clones neither block the Tauri event loop nor deadlock on a full pipe.
5. **Progress and failures are surfaced.** Clone/fetch/pull/push stderr lines are parsed (`Receiving objects: NN%`) into `git://progress` events. On failure the operation returns `GitOperationResult { ok: false, message }` (last non-empty stderr lines) rather than a bare `Err`, so the existing frontend success/error toast path handles it.
6. **Routing is centralized in `git_run_operation`** with an explicit network-op early return and a gix-vs-system-git dispatch documented in this ADR. Frontend call sites stay unchanged (they send the same `GitOperation` union + typed payloads).

## Rationale

- The system `git` binary is the reference implementation: battle-tested transport, credential handling, and write semantics. Spawning it avoids reimplementing (or vendoring) those behaviors.
- Keeping reads in gix preserves the fast, non-forking path for the high-frequency UI queries (status, diffs, graph) and avoids a process spawn per poll.
- Moving auth to Rust + `http.extraHeader` keeps secrets out of the frontend and out of argv, consistent with ADR-0005.

## Alternatives Considered

- **gitoxide network transport** (ureq/reqwest features): the transport feature is not compiled in the pinned gix 0.68.0 build; enabling it pulls an unproven stack. Rejected.
- **libgit2 / git2 crate**: a second, different Git engine alongside gix; would duplicate read code paths and add a C dependency. Rejected for this slice.
- **Forwarding the token from the frontend as an extraHeader argument**: leaks secrets into the JS layer and into command args. Rejected (ADR-0005).

## Consequences

- Desktop builds require a system `git` on PATH for clone/fetch/pull/push and complex writes; the settings page exposes a `git_git_version` command so the UI can show system-git availability. Browser preview reports the desktop-runtime message for every network/complex op (web-fallback runtime, ADR-0006).
- Network-op failures surface Git's own stderr (fetch/push errors, 2FA prompts) — surfaced verbatim, which can be noisy but is honest.
- `git://progress` gives percent text for clone/fetch/pull/push; other ops report indeterminate progress via the pulse panel.
- Tests for system-git paths shell out to `git` and skip when it is not on PATH (CI and dev machines here always have it).

## Follow-ups

- Configurable default `--depth`/shallow clone policy from preferences.
- Smart credential expiry / re-auth flow when a network op fails with 401.
