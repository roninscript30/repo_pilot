# Technical Debt

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-11

## Current Debt

- gitoxide is pinned to gix 0.68.0 (latest available when the shell was written). The Rust code targets this pinned API, so upgrading gix is a deliberate, effortful change (the first implementation was written against a newer API and did not compile).
- Keyring (3.x) has no credential-listing API; account enumeration relies on a non-secret `accounts.json` index sidecar in the app data directory. If an account is removed by an external keyring client, the index may reference a missing entry (listAccounts tolerates this).
- Worktree status iterates the whole repo tree; on very large repositories this is slow. No caching or incremental status yet.
- E2E tests cover browser-preview mode only; the Tauri desktop shell has no automated test coverage yet.
- Resolved items (for history): all `GitRuntime` operations now execute (Slice 2, ADR-0013 — the old `unsupported: true` surface is gone); `commit_to_detail` now populates additions/deletions/patch (Slice 3); the feature-module Repository IDE refactor is committed (`199b3d6`).

## Code Review Follow-ups (Slice 7, commit `05fcc00`)

Verified findings from the Slice 7 review — see `code-review-2026-08-11-slice7.md` for full detail, severity, and fix guidance. Fix order: **P1 first, then P2, then P3.**

### P1 — Functional / data correctness (fix first)

- **Tab-overflow menu never navigates.** `WorkspaceTabBar.tsx:282` — every overflow `onSelect` only closes the dropdown; "Open tabs" and "Recently opened" rows are dead (Pinned works). Route each row to `openTab` / reopen.
- **Per-account tab isolation leaks.** `workspace/store.ts:74` — `loadTabs`/`loadActiveTabId` fall back to the anonymous `workspace.tabs` key and the legacy bucket is never migrated-and-cleared, so a fresh account inherits a previous account's tabs. One-time migrate-and-delete.
- **Top contributors show "0 commits".** `mappers.ts:347` — `mapContributor` hardcodes `contributions: 0`; the dashboard card's display and sort are both broken. Populate `contributions` from `/repos/{fullName}/contributors`.
- **AppShell restore race.** `AppShell.tsx:39` — store hydrates from anonymous keys before auth restores; launches land on `/dashboard` instead of the last-active tab and account-switch desyncs URL vs tabs. Gate init on auth hydration; reconcile URL + tab together.

### P2 — Consistency / efficiency / observability

- **Dashboard vs repo-workspace cache keys diverge** for the same releases/contributors data (`dashboard/hooks.ts:98` vs `repository-data-hooks.ts:95,104`); **"Sync all" never refetches `['repository', …]`** queries (`DashboardPage.tsx:116`). Pick one key prefix; extend SyncAllButton.
- **Pinned source swallows errors** (`RepositoryBrowserPage.tsx:296`) — all-pins-fail shows "You have not pinned any repositories yet". Keep per-pin 404s silent but surface a real error when all fail.
- **SyncAllButton toasts success even when every refetch fails** (`DashboardPage.tsx:119`) — `refetchQueries` never rejects. Inspect results and toast failure when nothing refreshed.
- **Unconditional `useRepositories`** fires a wasted `listRepositories` call per browser visit (`RepositoryBrowserPage.tsx:266`). Gate on `source === 'yours'`.
- **Pinned set re-read from localStorage every render** + stale overflow-menu Pinned section (`repositories/hooks.ts:65`, `WorkspaceTabBar.tsx:90`). Memoize pins; fix memo deps.
- **Stale `selectedOrg` across account switch** keeps querying `/orgs/{org}/repos` for the old org (`RepositoryBrowserPage.tsx:275`). Reset + re-default on account change.
- **Bulk close skips `recordRecentlyClosed`** (`workspace/store.ts:192`), so bulk-closed tabs never reach the recovery list.

### P2/P3 — Rust and e2e

- **`git_compare_refs` duplicates the worktree-ref dispatch** owned by `git_diff_files` (`lib.rs:1246` / `diff.rs:227`) — extract a shared helper to kill the drift surface.
- **Sign-in e2e not hermetic** (`e2e/signin.spec.ts:37`) — new `releases`/`contributors` routes un-stubbed, hit the real network. Add the two stubs.

### P3 — Cleanup

- **Tag pushes mislabeled as branch pushes** (`mappers.ts:1515`) — normalize non-branch refs in the activity feed.
- **Dead code / duplicated helpers** (`workspace/store.ts:228`) — `currentStorageKeys()` wrapper, 3× local `githubProvider()`, uncalled `useReleases`/`useContributors`.

## Watch Items

- Avoid allowing the knowledge base to drift from implementation.
- Avoid provider-specific assumptions when the first integration is added.
- Avoid UI patterns that reduce transparency of repository operations.
- Do not float `gix` to a newer version casually: any upgrade must be planned against the vendored API surface and verified with `cargo check` + `cargo clippy`.
- Do not let the Slice 7 code-review follow-ups rot: every fix should delete its bullet here and note the commit in the implementation log.
