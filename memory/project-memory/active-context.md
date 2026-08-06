# Active Context

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-06

## Current Focus

The Phase 1 UI/UX build is complete: the full design system, app shell, first-run onboarding, dashboard, repository browser, and the tabbed repository workspace (overview, code explorer, commit graph, unified diffs, pulls, issues, releases) are implemented and all quality gates are green. Remaining known work: the initial application commit, local Git operation coverage in the Rust shell, and interactive desktop verification.

## Product Name Note

The repository and remote are named `repo_pilot`. The product display name is **GitOS** per the master specification. Display name is configurable; repository identity stays `repo_pilot`.

## Current Repository State

- Frontend complete: Tailwind token layer + ~40-component UI kit, app shell (NavRail/RepositorySidebar/AccountMenu/ContextPanel/StatusBar/NotificationCenter/CommandPalette/GlobalSearch), onboarding gate (8 steps, ADR-0008), dashboard, repository browser, tabbed repository workspace (overview/code/commits/pulls/issues/releases).
- Code explorer renders markdown safely (ADR-0009) and code with line numbers; commit graph + inspector and unified diff viewer cover history; pulls/issues/releases manage collaboration; sandbox and local repos pages surface the GitRuntime seam.
- Hooks layer (TanStack Query) per domain: use-repositories/use-dashboard/use-code/use-git/use-pulls/use-issues/use-releases/use-account; pure lib modules (diff, commit-graph, files, format, fuzzy, repository-health, clone-url) are unit-tested.
- Storage: user-preferences service (`gitos:preferences` in browser localStorage, keyring on desktop) backs onboarding flag, favorites ("favorite-repositories"), recent searches; credentials stay in memory in browser preview (ADR-0005).
- All quality gates green: `npm run typecheck`, `npm run lint`, `npm run build` (~4.7s), 94 Vitest unit tests (10 files), 8 Playwright e2e tests (onboarding walkthrough, returning-user sign-in, local repos), plus the previously verified cargo clippy/fmt and desktop build.
- Docker image `gitos` serves the browser preview on port 4173; GitHub Actions CI covers frontend, e2e, and desktop shell.
- NOTE: the git repository still contains only the initial memory commit; all application code, tests, CI, and Docker files are untracked and awaiting the initial commit.

## Near-Term Priorities

- Commit the initial application tree (first real commit).
- Continue Phase 1 local Git operations: implement push/pull/fetch and the remaining GitRuntime operations in lib.rs (currently `unsupported`).
- Interactive desktop verification (`npm run tauri dev` run through the UI; binary builds already verified).
- Provider roadmap: GitLab/Gitea/Forgejo behind the Provider port (listed as "Soon" in onboarding), OAuth device flow.

## Important Context For Future Agents

- Do not treat this as a GitHub Desktop clone.
- Preserve the broader platform vision (multi-provider, sandbox, intelligence, plugins).
- All provider calls flow through the `Provider` port; no UI imports provider-specific types.
- Secrets: OS keyring on desktop, in-memory only in browser preview. Never localStorage. Non-secret preferences (onboarding, favorites, recent searches) go through user-preferences.
- First-run onboarding gates the whole app at `App.tsx` before auth; e2e specs must either walk it or seed `gitos:preferences` -> `onboarding-completed`.
- TypeScript strict with `exactOptionalPropertyTypes`: never pass `undefined` for optional props (e.g. pass `{ limit }` only when the value is defined).
- No dynamic Tailwind class construction (lint/build fail); use static class maps for statuses/tone.
- Markdown uses `marked.use({ renderer })` at module level (a `RendererObject` is not accepted via `MarkedOptions.renderer`); raw HTML is escaped before parse (ADR-0009).
- `CommitSummary.parents` exists specifically to power the commit graph lane algorithm.
- The Rust shell is pinned to gix 0.68.0: consult the vendored source before using new APIs (many newer-gix idioms do not exist here). The session cheat-sheet for the working gix 0.68 API surface is recorded in the implementation log.
- Tauri commands marshal camelCase (serde rename_all) matching the TS contract; args structs are separate from response structs.
- Keep the knowledge base simple and maintained; update memory after meaningful work.
