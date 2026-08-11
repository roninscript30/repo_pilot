# Code Review — Slice 7 (Repo Activity, Persistent Tabs, Repo Sync Sources)

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-11
Reviewed Commit: `05fcc00` (feat: Phase 1.5 slice 7 — repo activity, per-account tabs & repo sync sources)
Review Scope: full working-tree diff of the Slice 7 change (`/tmp/slice7.diff`), cross-checked against live source
Review Method: multi-angle `/code-review` pass (cross-file caller tracing, provider interface impact, Rust worktree-diff semantics, GitHub API payload shape, mapper logic); every finding verified against current source, not just the diff
Verification Status: `npm run typecheck` and the new unit tests pass — findings are behavioral/logic defects, not compile failures

## Summary

15 verified findings. The top four are functional or data-correctness bugs in the new per-account tabs, activity feed, and dashboard features; the rest are consistency, efficiency, observability, and cleanup issues. Gate numbers (168 Vitest, 16 Rust, 10/10 e2e) are green, but two e2e specs were found to be non-hermetic (see finding 13).

## Severity Legend

- **P1 — functional / data-correctness bug** (user-visible wrong behavior or wrong data)
- **P2 — consistency / efficiency / observability gap** (works, but wrong under edge cases or wasteful)
- **P3 — cleanup / drift surface** (no behavior change, maintenance risk)

## Findings

### P1 — Functional / data correctness

1. **Tab-overflow menu never navigates.** `frontend/src/features/workspace/components/WorkspaceTabBar.tsx:282`. The "All tabs" overflow menu wires every `onSelect` to `() => setOverflowOpen(false)`, so clicking an entry in the "Open tabs" list (line 118) or the "Recently opened" list (line 145) only closes the dropdown — it never activates/navigates to or reopens the tab. Only "Pinned" works (`openPinned`, line 95, does `openTab` + navigate itself).
   - *Fix:* route each row's `onSelect` to `openTab(fullName)` (navigate) / `openTab(fullName, lastActivity)` (reopen recently-closed) instead of the shared close-only handler.

2. **Per-account tab isolation leaks through the legacy fallback.** `frontend/src/features/workspace/store.ts:74`. `loadTabs` (and `loadActiveTabId`, line 98) fall back to the shared anonymous keys `workspace.tabs` / `workspace.active-tab` whenever the current account's scoped key is absent, and the legacy bucket is never migrated-and-cleared.
   - *Failure:* account A signs out (tabs written to anonymous keys), then a fresh account B signs in — B has no scoped tabs, so the fallback loads A's tabs into B's workspace; opening one re-persists A's repos under B's scoped keys. The leak repeats for every fresh account.
   - *Fix:* one-time migration that reads the legacy bucket into the active account's scoped keys and deletes it; no fallback on subsequent loads.

3. **Top contributors always render "0 commits".** `frontend/src/providers/github/mappers.ts:347`. `mapContributor` hardcodes `contributions: 0` (and `GitHubUser` has no `contributions` field), but the new dashboard "Top contributors" card consumes that field for both display and sorting (`DashboardPage.tsx:165`; `dashboard/hooks.ts:136` sort is a no-op). The GitHub `/contributors` endpoint returns real counts — they are dropped by the mapper.
   - *Fix:* add `contributions` to the mapped type and populate it from the `contributions` field GitHub actually returns on `/repos/{fullName}/contributors`.

4. **AppShell restore race on launch and account switch.** `frontend/src/features/workspace/components/AppShell.tsx:39`. The workspace store is created at module load when the auth store is not yet hydrated (`account` null), so initial tabs/activeTabId come from the anonymous keys; `resetForAccount` runs in an effect *after* the first-run URL-reconcile effect (line 61) has already read the stale anonymous tabs from the render closure.
   - *Failure:* every launch with a persisted account lands on `/dashboard` instead of the account's last-active tab (strip highlights a repo tab while content shows the dashboard — visible desync). Account switch similarly resets the tab list without reconciling the URL.
   - *Fix:* gate the store init on auth hydration (or defer the reconcile effect until `resetForAccount` has run); reconcile URL + active tab together on account change.

### P2 — Consistency / efficiency / observability

5. **Dashboard and repo-workspace cache keys diverge for identical data; "Sync all" misses repository queries.** `frontend/src/features/dashboard/hooks.ts:98` vs `repository-data-hooks.ts:95,104`. Releases/contributors use `['dashboard', fullName, ...]` in the dashboard and `['repository', fullName, ...]` in the repo workspace — two cache entries, duplicate network calls, no dedup. `SyncAllButton` (`DashboardPage.tsx:116-117`) refetches only `['dashboard']` and `['repositories']`, so despite the "Dashboard and repositories refreshed." toast, no `['repository', ...]` query (activity feed, releases, contributors, tree) is ever refetched.
   - *Fix:* decide one key prefix for these shared endpoints and reuse it; extend SyncAllButton to also invalidate `['repository']` (or document that repo-workspace data refreshes on navigation only).

6. **Pinned source swallows errors.** `frontend/src/features/repositories/RepositoryBrowserPage.tsx:296`. Pinned normalizes errors away with `{ ...pinned, error: null }` and `usePinnedRepositories` (`hooks.ts:55-65`) exposes no refetch, so the Pinned tab can never render `ErrorState`. On network drop / token expiry the page shows "You have not pinned any repositories yet."
   - *Fix:* keep per-pin 404s silent (dead pins) but surface an error when *all* pins fail; expose `refetch`.

7. **SyncAllButton toasts success even when every refetch fails.** `frontend/src/features/dashboard/DashboardPage.tsx:119`. `refetchQueries` resolves without rejecting even when each individual refetch fails, and the button unconditionally toasts "Synced — Dashboard and repositories refreshed."
   - *Fix:* inspect the `refetchQueries` results (or use `QueryClient.isFetching` around a tracked set) and toast a failure state when nothing refreshed.

8. **Wasted `listRepositories` call on every browser visit.** `frontend/src/features/repositories/RepositoryBrowserPage.tsx:266`. `useRepositories(account !== null)` fires unconditionally even though its data is only consumed when `source === 'yours'` (plus the "Yours" badge length); the other source hooks are gated on the active source.
   - *Fix:* gate `useRepositories` on `source === 'yours'`.

9. **Pinned set re-read from localStorage every render.** `frontend/src/features/repositories/hooks.ts:65`. `getPinnedRepositoryNames()` (getItem + JSON.parse) runs on every render, rebuilding the `useQueries` array each time; `TabOverflowMenu` (`WorkspaceTabBar.tsx:90-93`) memoizes its Pinned section on `[openFullNames]` only.
   - *Fix:* read pins into memoized state (e.g. from the existing pins store) and add pin-related keys to the overflow menu's memo deps.

10. **Stale `selectedOrg` survives account switches.** `frontend/src/features/repositories/RepositoryBrowserPage.tsx:275`. The org-defaulting effect only fires when `selectedOrg === ''`; `selectedOrg` is component state that survives account switches and is not reset when the auth store clears the query cache.
    - *Failure:* user on Organizations selects "acme", then switches to an account not in "acme" — `orgRepositories` keeps querying `/orgs/acme/repos` (404/private error) and no chip renders active.
    - *Fix:* reset `selectedOrg` (and re-default it) on account change, and render a loading state until memberships resolve.

11. **Bulk-close never records recently-closed.** `frontend/src/features/workspace/store.ts:192`. `closeAll()` and `closeOthers()` skip `recordRecentlyClosed`, so bulk-closed tabs never reach the recovery list the new overflow menu surfaces — the exact action users most regret has no recovery path.

### P2/P3 — Rust and e2e

12. **`git_compare_refs` duplicates the worktree-ref dispatch.** `src-tauri/src/lib.rs:1246`. Base/target worktree detection, both-worktree early return, one-side resolution, `diff_worktree_against` call, and empty-divergence logic now exist in both `git_compare_refs` and `git_diff_files` (`src-tauri/src/diff.rs:227-247`). A future change to one command silently diverges compare-vs-diff results for worktree refs.
    - *Fix:* extract the one-side-worktree resolution into a shared helper.

13. **Sign-in e2e is no longer hermetic.** `e2e/signin.spec.ts:37`. `stubDashboardRoutes` stubs commits/pulls/issues/action-runs for `octocat/hello-world` but not the two queries this slice added: `/repos/octocat/hello-world/releases` and `/contributors`. Those go to the real network (401 with the fake token) in every sign-in e2e.
    - *Fix:* add the two stubs; re-verify e2e runs offline.

### P3 — Cleanup

14. **Tag pushes mislabeled as branch pushes.** `frontend/src/providers/github/mappers.ts:1515`. The push-event branch derivation strips only `^refs/heads/`, so `payload.ref = 'refs/tags/v1.2.0'` renders "Pushed N commits to v1.2.0" (and `payload.size` counts tag commits, double-wrong).
    - *Fix:* normalize tag refs (and other non-branch refs) distinctly in the activity feed.

15. **Dead code and duplicated helpers.** `frontend/src/features/workspace/store.ts:228`. `currentStorageKeys()` is a name-only wrapper over `currentKeys()` used inconsistently; three hooks files re-declare a local `githubProvider()` helper; and the new `useReleases`/`useContributors` in `dashboard/repository-data-hooks.ts:93-110` have no consumers.
    - *Fix:* drop the wrapper and dead hooks; extract `githubProvider()` into one shared location.

## Fix Priority

1. Findings **1–4** are user-visible correctness bugs in the exact surfaces Slice 7 shipped — fix first.
2. Findings **5–11** are correctness-under-edge-case / efficiency / observability gaps — fix before the next feature slice, not after.
3. Findings **12–15** are drift/cleanup — fold into routine work.

## Tracking

- Fixable defects are mirrored in `technical-debt.md` under "Code Review Follow-ups (Slice 7)" for actionable tracking.
- A future re-review should re-run the four angles above against the current HEAD (not just the diff) and confirm the four P1 findings are closed.
- Next review trigger: the next feature slice that touches tab persistence, repo sources, dashboard aggregation, or the worktree-diff path.
