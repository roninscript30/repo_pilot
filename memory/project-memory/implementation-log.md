# Implementation Log

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-06

This log records meaningful project progress in chronological order.

## 2026-08-06

- Initialized `memory/` as the project knowledge base and AI memory system.
- Added root `AGENTS.md` so AI contributors must read and maintain project memory.
- Added project vision, engineering rules, architecture direction, concepts, roadmap, and status.
- Added ADR system with initial decisions for project memory and desktop-first platform direction.
- Added initial feature catalog.
- Added reusable skills library for UI, React and TypeScript, Tauri and Rust, Git and provider APIs, testing, and documentation maintenance.
- Seeded skills with official online reference sources while keeping project guidance local and maintainable.
- Locked the technology stack: Tauri v2, React 18 + TypeScript (strict), Tailwind CSS, TanStack Query, Zustand, React Router, Vite, Vitest, Playwright (ADR-0003).
- Defined the provider boundary with a GitHub REST adapter behind a provider-neutral capability layer (ADR-0004).
- Defined authentication and secret storage: GitHub fine-grained PAT first, OAuth device flow later, OS keyring on desktop, in-memory in browser preview (ADR-0005).
- Defined the local Git engine seam using gitoxide (ADR-0006).
- Defined the testing pipeline and CI: Vitest, React Testing Library, Playwright, GitHub Actions (ADR-0007).
- Updated status, roadmap, architecture, constraints, and active-context to reflect the locked decisions.
- Installed the development toolchain: Rust 1.97.1 (rustup), Docker 29.1.3, and Tauri Linux system dependencies (webkit2gtk-4.1, librsvg, appindicator, patchelf, xdo, ssl).
- Scaffolding complete: Vite + React 18 + TypeScript strict + Tailwind app with browser-preview mode.
- Domain layer complete: provider-neutral models/ports (Repository, Branch, Commit, Issue, PullRequest, Release, Account), GitHub REST adapter behind Provider port.
- Auth vertical slice complete: fine-grained PAT + scope validation + credential store seam (TauriCredentialStore for desktop, InMemoryCredentialStore for browser).
- Repository browser and overview pages implemented.
- GitRuntime seam complete: TauriGitRuntime (gix-backed) + WebFallbackGitRuntime (transparent "requires desktop runtime" messaging).
- Tauri Rust shell implemented: lib.rs with credential commands (credential_set, credential_get, credential_delete, credential_list_accounts) and git commands (git_open_repository, git_worktree_status, git_list_branches, git_list_commits, git_get_commit, git_run_operation, git_run_in_sandbox) using gix; build.rs, tauri.conf.json, capabilities/default.json, icons generated.
- Fixed 7 lint errors (type imports in provider.ts, unused vars in git-runtime-web.ts, removed unused eslint-disable in main.tsx); typecheck and build pass.
- Rewrote src-tauri/src/lib.rs against the pinned gix 0.68.0 API (65 -> 0 compile errors): worktree status via status::Platform -> into_index_worktree_iter (iter::Item), head->index staged diff via diff_tree_to_tree, commits via rev_walk, branch/ref operations via reference edits, staging via gix_index File (dangerously_push_entry + sort_entries + write), commits via tree Editor + commit_as.
- Enabled gix `tree-editor` feature in Cargo.toml; converted app icons to RGBA PNG (Tauri context requires RGBA); fixed invalid bundle identifier (underscore) in tauri.conf.json; added serde camelCase rename to all command args/response structs to match the TS contract.
- `npm run tauri build --no-bundle` compiles the desktop binary successfully; `cargo clippy` and `cargo fmt --check` clean.
- Added .gitignore entries (dist/, src-tauri/target/, .env, coverage, playwright-report, test-results) and .dockerignore.
- Added 7 Vitest test files, 73 tests passing: format, GitHub api client (error mapping, headers, query params), GitHub mappers, GitHub provider, MemoryCredentialStore, repository pins, auth store (registry mocked deterministically).
- Added Playwright config + 2 e2e specs, 6 tests passing against the browser preview (Vite dev server): sign-in boot/enable/success/stale-token-error, local repos web-fallback messaging.
- Fixed sign-in error-state routing bug in App.tsx: failed validation now stays on the sign-in page and shows the error (previously navigated into the shell).
- Added multi-stage Dockerfile (browser preview via `vite preview`) and verified `docker run` serves HTTP 200.
- Added .github/workflows/ci.yml: frontend (lint, typecheck, unit, build), Playwright e2e, desktop shell (cargo check, clippy -D warnings, fmt --check).
- Next: commit the initial application tree (repo currently contains only the initial memory commit; all app code is untracked), then continue Phase 1 (branch management, commit detail enhancements, push/pull/stash behind GitRuntime).

## Phase 1 UI/UX Build (2026-08-06)

- Design system: Tailwind token layer (accent/surface/status/radii/shadows, dark mode), plus a full UI kit: Button, Icon (icon set extended with `more` and others), Avatar (xs size), Badge, Tag, Card, Spinner, Skeleton, StatusDot, ProgressBar, Kbd, Tooltip, Popover, DropdownMenu, Dialog, HoverCard, Tabs, Table, SegmentedControl, SearchInput, TextField, TextArea, SelectField, Toast/ToastProvider, CommandDialog, EmptyState, ErrorState.
- App shell (Linear/Arc style): AppLayout with NavRail (icon-only, aria-labels), RepositorySidebar, AccountMenu, ContextPanel, StatusBar, NotificationCenter, CommandPalette, GlobalSearch; services for recent repos/searches.
- First-run onboarding gate (8 steps, ADR-0008) with `useOnboardingStore` persisted via user-preferences; classic SignInPage retained for returning users.
- Dashboard: `use-dashboard` (useQueries fan-out over top 3 repos: pulls, assigned issues, 7-day commits, workflow runs), repository-health scoring, pinned repos, recent searches.
- Repository browser rewrite: grid/table/compact views, sort (name/updated/stars), privacy + language filters, pinned/favorites, group-by-owner, URL `?q=` search, HoverCard preview, quick actions (clone/favorite/GitHub) via `lib/clone-url`; favorites persisted via `favorites-store` ("favorite-repositories" preference).
- Repository workspace: `RepositoryDetailPage` tabbed (overview/code/commits/pulls/issues/releases) with URL state (`?tab=`, `?path=`, `?branch=`), WorkspaceHeader clone/star/GitHub actions, OverviewTab with rendered README.
- Code explorer: `use-code` hooks, MarkdownView (marked + highlight.js, raw-HTML escaping, safe href protocols, ADR-0009), FileTree (recursive), CodeFileView (line numbers, wrap/copy/download, extension->language map), `lib/files` + tests.
- Commit history: `CommitSummary.parents` added to the model + GitHub mappers; `use-git` hooks; `lib/commit-graph` lane assignment (mainline + side continuity) + tests; SVG CommitGraph with per-lane colors; CommitInspector (unified diff rendering).
- Unified diff viewer: `lib/diff` (parseUnifiedDiff, LCS computeLineDiff with bounded matrix, splitPatchByFile, parseDiffPath, diffStats) + 13 tests; DiffViewer with static status class maps.
- Collaboration: use-pulls/use-issues/use-releases hooks; PullsTab (state filter, files/commits/reviews detail tabs), IssuesTab (+CreateIssueDialog via useCreateIssue), ReleasesTab (MarkdownView notes, asset downloads); all wired into the workspace.
- Sandbox and Local Repos pages restyled to the design system (Cards, TextField, Badge, result styling via `resultStyle()` helper for ok/unsupported/message results).
- Tests now at 94 Vitest (10 files); e2e reworked for the onboarding gate: full onboarding walkthrough test, returning-user sign-in tests, local-repos specs updated to walk onboarding via a shared helper.
- e2e fixes surfaced by the rewrite: nav rail is `aria-label="Global navigation"` (not "Primary"); icon-only NavLinks lacked accessible names (added `aria-label`); "Open" button needs `exact: true` (clashes with "Open command palette"); mocked GitHub responses must include `Access-Control-Allow-Origin` + `Access-Control-Expose-Headers: x-oauth-scopes` or the browser hides the scopes header from page JS.
- All gates green: typecheck, lint, build (~4.7s), 94 unit tests, 8 e2e tests.
- Next: initial application commit, then local Git operation coverage in the Rust shell and interactive desktop verification.

## Feature-Module Refactor + Git-Engine Workspaces (2026-08-07)

- Migrated the codebase to a feature-module architecture: every domain lives under `src/features/<name>/` (dashboard, repositories, repo, worktree, sync, branches, compare, git, auth, code, issues, pulls, releases, local, sandbox, settings, workspace, collaboration-hooks). Shared UI stays in `src/components/ui/`, cross-cutting services in `src/services/`.
- Rewrote the shell as a VS Code-style `AppShell` (workspace tab bar) and `src/App.tsx` routing: `/dashboard`, `/repositories`, `/repo/:owner/:name`, `/repo/:owner/:name/:activity`, `/sandbox`, `/local`, `/settings`, plus `/` redirect to dashboard. `repoWorkspacePath(owner, name, activity?)` and `repoWorkspacePathForFullName(fullName, activity?)` are the canonical link helpers in `src/features/workspace/lib/tabs.ts`.
- Repository workspace: `RepositoryWorkspace` composition root mapping the 11 activities (overview/code/commits/worktree/branches/sync/compare/pulls/issues/releases/settings) with `RepoActivityRail` (badge counts), `WorkspaceHeader` (identity, favorite, clone, link, local-path badge), and `LocalRepoGate` (native folder picker + link/report). `RepoSettingsView` for repo settings + local copy management.
- Git-engine workspaces: `WorktreeView` (grouped staged/unstaged/untracked/ignored changes; stage/unstage/restore/discard; commit + amend; per-file `useFileDiff` + DiffViewer), `SyncCenter` (fetch/pull/push, reflog-based sync log), `BranchExplorer` (create/checkout/rename/delete + history), `CompareView` (base/target compare + merge preview). All flow through the GitRuntime seam (`git-runtime-tauri.ts` / `git-runtime-web.ts`).
- Settings page (`SettingsPage`): account, appearance theme segmented control, runtime badge, workspace cleanup, forget local repos, sign-out dialog.
- Migrated all repo navigation away from the old `/repositories/:owner/:name` pattern: dashboard, repository browser, workspace commands, GlobalSearch, CommandPalette.
- Rust GitEngine expansion in `src-tauri/src/lib.rs` (gix 0.68.0):
  - `get_worktree_status` rewritten: staged stats via HEAD vs index tree diff (`change.diff(&mut cache)` + `line_counts`, `for_each_to_obtain_tree`), unstaged via `into_index_worktree_iter`, untracked via `line_count`, ignored via `dirwalk_options.set_emit_ignored(EmissionMode::Matching)`; tracking branch resolution + ahead/behind via `count_reachable`; output now includes `staged`/`unstaged`/`untracked`/`ignored` path lists and per-file stats.
  - New commands: `git_file_diff` (HEAD/index vs index/worktree, unified patch via imara-diff `InternedInput`/`blob::diff`, binary detection), `git_compare_refs` (merge_base.detach(), `commits_between` via `rev_walk().with_pruned()`, `files_between_commits` stats, `overlapping_paths` conflict prediction), `git_merge_preview` (fast-forward check + predicted conflicts), `git_sync_log` (reads `logs/HEAD`, last matching fetch/pull/push timestamp), `pick_repository_folder` (tauri-plugin-dialog blocking folder picker under `spawn_blocking`).
  - gix 0.68 API corrections during compile/clippy: `merge_base()` returns attached `Id` (detach); walkers yield per-item `Result`; `Change` `location()`/`id()`/`diff(&mut cache)` are methods and Rewrite `copy` is a plain bool; `InternedInput` tokens index `Interner` via `input.interner[*token]`; `tree.iter()` gives `Result<EntryRef>` with method accessors `filename()`/`mode()`/`oid()`.
  - `src-tauri/capabilities/default.json` now includes `"dialog:default"`; cargo `check` and `clippy --all-targets -- -D warnings` clean.
- e2e hardening: sign-in/onboarding specs now stub the dashboard's per-repo collaboration routes (`/repos/octocat/hello-world/commits|pulls|issues|actions/runs`) so they no longer depend on live GitHub API (rate-limit safe); all 8 e2e tests green.
- All gates green: typecheck, lint (0 warnings), build (1.41 MB bundle warning only), 94 Vitest tests (10 files), 8 Playwright e2e, cargo check + clippy.
- Next: initial application commit (all of the above is still untracked), interactive desktop verification (folder picker + Git commands), and the still-`unsupported` push/pull/fetch in `git_run_operation`/`git_run_in_sandbox`.

## Initial Application Commit (2026-08-07)

- Made the initial application commit `b2cd37b` "initial application: GitOS Phase 1 UI/UX build" — the Phase 1 UI/UX tree (design system, app shell, onboarding gate, dashboard, repository browser, code explorer, commit history + unified diff viewer, collaboration tabs, sandbox, local repos, Rust/Tauri shell, CI, Docker) is now committed.
- The feature-module Repository IDE refactor documented below remains staged/uncommitted on top of it and is the next commit to land.
- Next: commit the feature-module refactor + Git-engine workspaces + GitEngine expansion; interactive desktop verification (native folder picker, diff/compare/sync commands); implement push/pull/fetch and the remaining `unsupported` operations in `git_run_operation`/`git_run_in_sandbox`.
