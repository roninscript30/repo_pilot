# Implementation Status

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-07

## Current Stage

Phase 0 foundation complete; Phase 1 UI/UX build complete (initial application commit `b2cd37b`); feature-module Repository IDE refactor complete and committed (`199b3d6`) along with the Repo Pilot rebrand and the frontend split into its own `frontend/` npm workspace. Next: push/pull/fetch coverage, desktop verification.

## Completed

- Knowledge base, AI contributor contract, vision, concepts, architecture, roadmap, feature catalog, skills library, and ADRs (0001-0009).
- Technology stack (ADR-0003): Tauri v2, React 18 + TypeScript (strict), Tailwind CSS, TanStack Query, Zustand, Vite, Vitest, Playwright.
- Provider boundary with GitHub REST adapter (ADR-0004); authentication/secret storage strategy (ADR-0005); local Git engine seam with gitoxide (ADR-0006); testing pipeline + CI (ADR-0007).
- Design system: Tailwind tokens (accent/surface/status/radii/shadows, dark mode) + full UI kit (Button, Icon, Avatar, Badge, Tag, Card, Spinner, Skeleton, StatusDot, ProgressBar, Kbd, Tooltip, Popover, DropdownMenu, Dialog, HoverCard, Tabs, Table, SegmentedControl, SearchInput, TextField, TextArea, SelectField, Toast, CommandDialog, EmptyState, ErrorState).
- App shell: NavRail (icon-only, aria-labelled), RepositorySidebar, AccountMenu, ContextPanel, StatusBar, NotificationCenter, CommandPalette, GlobalSearch.
- First-run onboarding gate (ADR-0008): 8-step walkthrough, persisted via user-preferences; classic sign-in retained for returning users.
- Dashboard: collaboration overview (pulls/issues/commits/workflow runs across top repos), repository health, pinned repos, recent searches.
- Repository browser: grid/table/compact views, sort/filters, pinned/favorites (persisted), group-by-owner, URL search, HoverCard preview, quick actions.
- Repository workspace: tabbed overview/code/commits/pulls/issues/releases with URL state; WorkspaceHeader actions; OverviewTab with rendered README.
- Code explorer: safe markdown rendering (ADR-0009), file tree, line-numbered code viewer with wrap/copy/download.
- Commit history: commit graph (SVG lanes, merge curves), commit inspector, unified diff viewer (LCS-based `lib/diff`, 13 tests).
- Collaboration: pulls (state filter + files/commits/reviews), issues (+create), releases (notes + asset downloads).
- Sandbox and Local Repos pages on the design system; GitRuntime seam intact (gix on desktop, web-fallback messaging in browser).
- Rust/Tauri shell: credential commands (keyring + account index sidecar) and git commands on gix 0.68.0; desktop build verified (`npm run tauri build --no-bundle`, clippy/fmt clean).
- Docker container for one-command browser-preview runs (verified HTTP 200); GitHub Actions CI added.
- Feature-module architecture refactor: domains moved under `src/features/<name>/` (components/, hooks.ts/lib/, services), shared UI in `src/components/ui/`, cross-cutting in `src/services/`.
- Workspace shell: `AppShell` tabbed shell + `App.tsx` routing (`/dashboard`, `/repositories`, `/repo/:owner/:name/:activity?`, `/sandbox`, `/local`, `/settings`); canonical link helpers `repoWorkspacePath` / `repoWorkspacePathForFullName` in `src/features/workspace/lib/tabs.ts`.
- Repository workspace (`/repo/:owner/:name/:activity`): composition root over the 11 activities with RepoActivityRail, WorkspaceHeader (favorite/clone/link/local badge), LocalRepoGate (native folder picker, browser fallback messaging), RepoSettingsView.
- Git-engine activities: WorktreeView (grouped changes, stage/unstage/restore/discard, commit/amend, per-file diffs), SyncCenter (fetch/pull/push + sync log), BranchExplorer (create/checkout/rename/delete + history), CompareView (base/target summary + merge preview).
- Settings page: account/appearance/runtime/workspace cleanup/forget local repos/sign-out.
- Rust GitEngine expansion (gix 0.68.0): `git_file_diff`, `git_compare_refs`, `git_merge_preview`, `git_sync_log`, `pick_repository_folder`, and `git_worktree_status` full shape (staged/unstaged/untracked/ignored + per-file stats + tracking ahead/behind). Capabilities include `dialog:default`; cargo check + clippy clean.
- Quality gates green: typecheck, lint (0 warnings), build (bundle size warning only), 94 Vitest tests (10 files), 8 Playwright e2e tests (dashboard routes stubbed so no live API dependency).
- Commit `199b3d6`: feature-module Repository IDE refactor, Repo Pilot rebrand (GitOS → Repo Pilot across UI, storage keys, Rust crate/types, bundle id, Docker image), frontend moved into `frontend/` npm workspace, memory `README.md`s renamed (index/catalog/registry).

## In Progress

- Interactive desktop verification (`npm run tauri dev` run through the UI, including the native folder picker and the new diff/compare/sync commands).
- Local Git operation coverage in the Rust shell: push, pull, fetch, restore, checkout, rename-branch, cherry-pick, revert, reset, tag, stash, compare-branches currently return `unsupported` (UI renders an amber warning).

## Not Started

- OAuth device flow
- GitLab/Gitea/Forgejo providers behind the Provider port
- Release pipeline
- Intelligence layer (platform vision)

## Next Likely Work

- Implement push/pull/fetch and remaining GitRuntime operations in lib.rs.
- Interactive desktop verification of the repository workspace / Git-engine activities.
- OAuth device flow behind the auth session model.
- Second provider (GitLab or Gitea) behind the Provider port.
