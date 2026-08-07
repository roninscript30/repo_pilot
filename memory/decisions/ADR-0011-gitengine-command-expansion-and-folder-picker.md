# ADR-0011: GitEngine Command Expansion and Native Folder Picker

Status: Accepted
Date: 2026-08-07

## Context

The Git-engine activities (working tree, sync, branches, compare) and the local-repository linking flow required new capabilities at the Tauri boundary: file-level diffs, ref comparison + merge previews, reflog-derived sync timestamps, and selecting a local folder to link to a repository.

## Decision

Extend the Rust GitEngine command surface and add a native folder picker.

- New commands (camelCase serde, matching the TS contract in `src/services/git-runtime-tauri.ts`):
  - `git_file_diff` — HEAD or index versus index or worktree, with unified patch and add/delete line counts, binary detection; `patch: null` for binary/empty content.
  - `git_compare_refs` — merge base (attached `Id` from `repo.merge_base()`, detached for use as `ObjectId`), ahead/behind via `count_reachable`, `commits_between` via `rev_walk().with_pruned()`, per-file stats, and predicted `conflict_paths` from `overlapping_paths` (paths changed on both sides relative to merge base).
  - `git_merge_preview` — fast-forward detection (`merge_base == head_ref`), commits ahead, changed files, predicted conflicts, `can_merge`.
  - `git_sync_log` — last fetch/pull/push timestamp parsed from `logs/HEAD` (gix 0.68 exposes no high-level reflog iterator; the file format is `old new unix tz \t message`).
  - `pick_repository_folder` — tauri-plugin-dialog `blocking_pick_folder()` inside `spawn_blocking` (never on the main thread), returning the selected path or null.
- **Capabilities:** `src-tauri/capabilities/default.json` adds `"dialog:default"`; the dialog plugin is registered (`tauri_plugin_dialog`).
- `git_worktree_status` is expanded (not breaking): adds `staged/unstaged/untracked/ignored` path lists, per-file stats, and tracking ahead/behind derived from `find_tracking_branch` + `count_reachable`. Ignored files use `dirwalk_options.set_emit_ignored(EmissionMode::Matching)`.

## Rationale

- Matches the gix 0.68 API surface available in the pinned version (no newer-gix idioms); verified against vendored source before use.
- Conflict prediction is best-effort path-overlap (a real merge 3-way resolution is future work) — the UI labels it "predicted conflicts".
- Reading `logs/HEAD` directly avoids depending on an absent high-level gix API.
- The folder picker keeps the native dialog off the main thread to respect the plugin's blocking contract and returns the plain path string so the frontend needs no filesystem plugin.

## Consequences

- New GitEngine commands reveal gaps if `cargo check`/clippy are not green; the gix API cheat-sheet in the implementation log must be updated together with any gix pin change.
- `git_run_operation` and `git_run_in_sandbox` still return `unsupported` for push/pull/fetch/restore/checkout/rename/rebase/etc.; those surfaces render the amber "requires desktop runtime" notice (browser) / "not implemented" (desktop) until implemented.