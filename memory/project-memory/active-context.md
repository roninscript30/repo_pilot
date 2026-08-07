# Active Context

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-07

## Current Focus

The application was refactored into a feature-module Repository IDE: a feature-module architecture, a VS Code-style workspace shell, a `/repo/:owner/:name/:activity` repository workspace wired to the Git engine (working tree, sync, branches, compare), and a settings page. The Rust GitEngine was expanded with diff/compare/merge-preview/sync-log commands and a native folder-picker command. All TS gates, unit tests, e2e, and `cargo check`/`clippy -D warnings`/`fmt --check` are green, and the refactor + Repo Pilot rebrand + frontend split are committed (`199b3d6`).

**Phase 1.5 (in progress, uncommitted):** Slice 1 "Account platform" is complete (multi-account + OAuth Device Flow + account management) — see the state bullets below and ADR-0012. Next: Slice 2 "Native Git engine" (clone/push/pull/fetch via system git, all GitOperations, `git_commit_graph`, git progress/repo-changed events).

## Product Name Note

The repository and remote are named `repo_pilot`. The product display name is **Repo Pilot** per the master specification. Display name is configurable; repository identity stays `repo_pilot`.

## Current Repository State

- App architecture: feature-module migration complete. The React app lives under `frontend/` (its own npm workspace; root `package.json` orchestrates). Each domain lives under `frontend/src/features/<name>/` with its own `components/`, `hooks.ts`/`lib/`, and `services/`; shared UI in `frontend/src/components/ui/`; cross-cutting services in `frontend/src/services/`. Shell is a VS Code-style `AppShell` (NavRail + tabbed workspace shell) with `RequireAuth` + onboarding gate (ADR-0008) in `frontend/src/App.tsx`.
- Routing: `/dashboard`, `/repositories`, `/repo/:owner/:name/:activity?` (the repository workspace), `/sandbox`, `/local`, `/settings`, plus root redirect to `/dashboard` and a `*` fallback. Navigation helpers `repoWorkspacePath(owner, name, activity?)` and `repoWorkspacePathForFullName(fullName, activity?)` in `frontend/src/features/workspace/lib/tabs.ts` are the single source for repo links.
- Repository workspace (`RepositoryWorkspace.tsx`) maps the 11 activities (overview/code/commits/worktree/branches/sync/compare/pulls/issues/releases/settings) with a vertical `RepoActivityRail`, a `WorkspaceHeader` (identity, favorite, clone, link, local-path badge) and a `LocalRepoGate` that links a local copy (native folder picker via `pick_repository_folder`; browser shows a hint + link to `/local`).
- Git-engine activities are fully wired through the GitRuntime seam: `WorktreeView` (staged/unstaged/untracked/ignored grouping, stage/unstage/restore/discard, commit + amend, per-file `useFileDiff` with DiffViewer), `SyncCenter` (fetch/pull/push + sync log), `BranchExplorer` (create/checkout/rename/delete + per-branch history), `CompareView` (base/target compare summary + merge preview).
- Settings page: accounts list (switch/remove/add per connected GitHub account, scope display, active badge), appearance (theme segmented control), runtime engine badge, workspace cleanup, forget local repos, remove-account confirm dialog.
- Account platform (Slice 1, ADR-0012): `useAuthStore` holds `accounts[]` + active `account` (back-compat getter) + `epoch`; actions `signInWithToken` (upserts account, activates it), `loadStoredSessions` (validates every stored token, restores all valid accounts, activates last-active via `auth.activeAccount` preference), `switchAccount`, `removeAccount` (falls back to remaining account), `signOut` (removes one account). `ProviderRegistry.setActiveAccount` binds `githubProvider()` to one account's token (per-account instance cache); `resolveProvider(store, accountLogin?)` binds a provider to one login. Account changes call `queryClient.clear()` (shared `services/query-client.ts` singleton) so provider queries refetch under the new account.
- GitHub OAuth Device Flow (Slice 1): `providers/github/device-flow.ts` `GitHubDeviceFlowClient` (configurable `VITE_GITHUB_CLIENT_ID`, placeholder default), `GithubDeviceFlowView` (user code + verification URI + copy + reopen + polling with slow-down/expired/denied handling), `AddAccountDialog` (device flow or PAT), updated `SignInPage` (primary "Continue with GitHub" + PAT fallback), `AccountMenu` (per-account switch list + add), `services/open-external.ts` → new Rust `open_external(url)` command (platform opener via `std::process::Command`; refuses non-HTTP; no new crates).
- Rust GitEngine (gix 0.68.0) commands: credential commands, `git_open_repository`, `git_worktree_status` (full shape: staged/unstaged/untracked/ignored + per-file stats + tracking ahead/behind), `git_list_branches`, `git_list_commits`, `git_get_commit`, `git_file_diff` (HEAD/index vs index/worktree with unified patch), `git_compare_refs`, `git_merge_preview`, `git_sync_log` (reflog-derived fetch/pull/push timestamps), `git_run_operation` (stage/unstage/commit/create-branch/delete-branch; push/pull/fetch/restore/checkout/rename-branch/cherry-pick/revert/reset/tag/stash/compare-branches remain `unsupported`), `git_run_in_sandbox` (commit only), and `pick_repository_folder` (tauri-plugin-dialog, `dialog:default` capability added).
- Storage: user-preferences service (`repoPilot:preferences` in browser localStorage, keyring on desktop) backs onboarding flag, favorites, recent searches; local-repos link map in `useLocalReposStore` (localStorage on desktop); credentials in memory in browser preview (ADR-0005).
- All quality gates green: `npm run typecheck`, `npm run lint` (0 warnings), `npm run build` (size-warning only), 105 Vitest unit tests (11 files), 9 Playwright e2e tests, `cargo check` and `cargo clippy --all-targets -- -D warnings` and `cargo fmt --check` clean.
- NOTE: the initial application commit (`b2cd37b`) and the feature-module Repository IDE refactor + Repo Pilot rebrand + frontend split (`199b3d6`) are both in; the working tree is clean. `199b3d6` also moved the React app into `frontend/` (npm workspace), renamed the memory `README.md`s (index/catalog/registry), and rebranded GitOS → Repo Pilot.

## Near-Term Priorities

- Phase 1.5 slices (in order): 2) Native Git engine — clone/push/pull/fetch via system git (ADR), all remaining GitOperations, `git_commit_graph` (full DAG + refs + parents), `git://progress` + `git://repo-changed` events (notify watcher); 3) Commit center + Sync center; 4) Compare center + diff experience (structured hunks, unified/split/word); 5) Branch explorer + interactive branch graph; 6) PR + Issues workspaces (Provider mutations); 7) Repo activity + persistent per-account tabs + repo sync sources.
- Register a real GitHub OAuth App and set `VITE_GITHUB_CLIENT_ID` for production device flow (placeholder client_id currently).
- Interactive desktop verification (`npm run tauri dev`) including device flow and the new commands.

## Important Context For Future Agents

- Do not treat this as a GitHub Desktop clone.
- Preserve the broader platform vision (multi-provider, sandbox, intelligence, plugins).
- All provider calls flow through the `Provider` port; no UI imports provider-specific types.
- Multi-account (ADR-0012): the provider registry resolves `githubProvider()` to the active account's token; account changes clear the React Query cache. Never cache per-account data in module singletons that would leak across a switch. Startup validates every stored token (expired/revoked accounts are omitted, not errors).
- Device Flow: `client_id` from `VITE_GITHUB_CLIENT_ID` (placeholder default); CSP already allows `github.com`. The system-browser opener is the Rust `open_external` command.
- Secrets: OS keyring on desktop, in-memory only in browser preview. Never localStorage. Non-secret preferences (onboarding, favorites, recent searches) go through user-preferences.
- First-run onboarding gates the whole app at `App.tsx` before auth; e2e specs must either walk it or seed `repoPilot:preferences` -> `onboarding-completed`.
- TypeScript strict with `exactOptionalPropertyTypes`: never pass `undefined` for optional props (e.g. pass `{ limit }` only when the value is defined).
- No dynamic Tailwind class construction (lint/build fail); use static class maps for statuses/tone.
- Markdown uses `marked.use({ renderer })` at module level (a `RendererObject` is not accepted via `MarkedOptions.renderer`); raw HTML is escaped before parse (ADR-0009).
- `CommitSummary.parents` exists specifically to power the commit graph lane algorithm.
- The Rust shell is pinned to gix 0.68.0: consult the vendored source before using new APIs (many newer-gix idioms do not exist here). The session cheat-sheet for the working gix 0.68 API surface is recorded in the implementation log.
- Tauri commands marshal camelCase (serde rename_all) matching the TS contract; args structs are separate from response structs. `repo.merge_base()` returns an attached `Id` — detach with `.detach()` before treating it as an `ObjectId`; tree/commit walkers yield per-item `Result` (map each element); `gix::object::tree::diff::Change` `location()`, `id()`, `diff(&mut cache)`, and Rewrite `copy` are accessors / a plain bool (no `*copy`).
- UI kit constraints: `Button` sizes are only `sm|md` (no `xs`; use `sm`) with variants `primary|secondary|ghost|danger`; `CardHeader` accepts an `action` ReactNode; `SearchInput` `onChange(value: string)`; the icon set has no `spinner` — use `refresh` for busy/picking states.
- Keep the knowledge base simple and maintained; update memory after meaningful work.
