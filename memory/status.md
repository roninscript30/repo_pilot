# Implementation Status

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-06

## Current Stage

Phase 0 foundation complete; Phase 1 UI/UX build complete (design system, shell, onboarding, dashboard, browser, tabbed repository workspace). Next: initial application commit, local Git operation coverage, desktop verification.

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
- Quality gates green: typecheck, lint, build (~4.7s), 94 Vitest tests (10 files), 8 Playwright e2e tests (onboarding walkthrough, returning-user sign-in, local repos).

## In Progress

- Initial application commit (repo currently holds only the memory-base initial commit; all app code is untracked).
- Local Git operation coverage in the Rust shell: push, pull, fetch, restore, checkout, rename-branch, cherry-pick, revert, reset, tag, stash, compare-branches currently return `unsupported` (UI renders an amber warning).
- Interactive desktop verification (`npm run tauri dev` run through the UI).

## Not Started

- OAuth device flow
- GitLab/Gitea/Forgejo providers behind the Provider port
- Repository sandbox (realistic operations)
- Release pipeline
- Intelligence layer (platform vision)

## Next Likely Work

- Commit the initial application tree.
- Implement push/pull/fetch and remaining GitRuntime operations in lib.rs.
- Interactive desktop verification of the Phase 1 UI/UX.
- OAuth device flow behind the auth session model.
- Second provider (GitLab or Gitea) behind the Provider port.
