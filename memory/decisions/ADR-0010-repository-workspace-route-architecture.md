# ADR-0010: Repository Workspace Route Architecture

Status: Accepted
Date: 2026-08-07

## Context

The repository detail experience (previously a tabbed `RepositoryDetailPage` under `/repositories/:owner/:name`) grew to include Git-engine activities (working tree, sync, branches, compare) alongside remote collaboration tabs (pulls, issues, releases, commits). The old URL scheme could not express the new activities and duplicated navigation logic across dashboard, browser, search, and command palette.

## Decision

Route the repository workspace at `/repo/:owner/:name/:activity?` and render it from a single composition root.

- The workspace maps the fixed activity order: `overview → code → commits → worktree → branches → sync → compare → pulls → issues → releases → settings`, with `overview` as the default when `:activity` is absent.
- Helpers `repoWorkspacePath(owner, name, activity?)` and `repoWorkspacePathForFullName(fullName, activity?)` in `src/features/workspace/lib/tabs.ts` are the single source for building repository links across the app; the old `/repositories/:owner/:name[/…]` paths are removed.
- The composition root (`RepositoryWorkspace`) layers the repository identity header, a vertical activity rail, a local-repository gate for Git-engine activities, and the activity view below `/dashboard`, `/repositories`, `/sandbox`, `/local`, `/settings` in `App.tsx`.

## Rationale

- Keeps one consistent URL scheme for every repository surface and every navigation entry point.
- Lets Git-engine activities (which require a linked local copy) degrade gracefully in browser preview through the gate, while remote activities render regardless.
- A stable activity token list keeps the shell, rail badges, and routes in sync.

## Consequences

- Any new repository surface is added by extending the activity map, the rail, and the router token list together.
- Link generation must always go through `repoWorkspacePathForFullName`; direct `/repositories/:name` links leak back in, they tokenize again in lint review.
- The e2e specs assert navigation links under the new scheme (`/dashboard`, `/repositories`, `/local`, `/settings`).