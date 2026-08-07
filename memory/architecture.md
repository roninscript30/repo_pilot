# Architecture

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-07

Repo Pilot (product **Repo Pilot**) is implemented as a feature-module desktop application (Tauri v2 + React) with the architecture below. This document defines the architecture principles the implementation follows and the decisions locked so far.

## Target Shape

Repo Pilot should evolve as a modular desktop application with clear separation between:

- User interface
- Application workflows
- Domain concepts
- Provider integrations
- Local system integration
- Persistence and cache layers
- Background operations
- Plugin or extension boundaries

## Architecture Principles

- Desktop-first, but not desktop-limited.
- Multi-provider from the beginning of the design, even if one provider is implemented first.
- Local Git support should be treated as a first-class capability, not an afterthought.
- Offline capabilities should be possible without redesigning core concepts.
- AI-assisted workflows should explain reasoning and preserve user control.
- Repository intelligence should be built from transparent, inspectable data.

## Provider Boundary

GitHub, GitLab, Forgejo, Gitea, and other Git-compatible services should be integrated through provider adapters.

Application features should depend on provider-neutral capabilities such as repositories, branches, issues, pull requests, releases, workflows, users, and permissions.

Provider-specific behavior should be isolated and documented.

## UI Boundary

The UI should present repository operations clearly and should not hide important engineering details.

UI components should be reusable and accessible. Product design should support both individual developers and larger engineering teams.

## Future Plugin Boundary

The platform should eventually support plugins or extensions. Early architecture should avoid hard-coding assumptions that would prevent external capabilities later.

## Open Questions

- Plugin runtime model

## Resolved Decisions

- Desktop framework: Tauri v2 (ADR-0003).
- Frontend framework and design system: React 18 + TypeScript (strict), Tailwind CSS, TanStack Query, Zustand, React Router, Vite (ADR-0003); clean, professional, minimal, keyboard-first UI (product spec).
- Authentication and secret storage: provider-based auth, GitHub fine-grained PAT first then OAuth device flow; OS keyring on desktop, in-memory in browser preview (ADR-0005).
- Provider abstraction: provider-neutral capability layer with GitHub REST adapter (ADR-0004).
- Local Git strategy: gitoxide behind a GitRuntime seam (ADR-0006).
- Local data storage strategy: provider server state cached by TanStack Query; durable secrets only in OS keyring; browser preview keeps sessions in memory (ADR-0005).
- Testing and CI: Vitest, React Testing Library, Playwright, GitHub Actions (ADR-0007).
- First-run onboarding gate before auth; persisted via user-preferences (ADR-0008).
- Safe markdown rendering: raw HTML escaped before parse (ADR-0009).
- Repository workspace routed at `/repo/:owner/:name/:activity` with canonical link helpers `repoWorkspacePath` / `repoWorkspacePathForFullName` (ADR-0010).
- GitEngine command surface expanded (file diff, ref compare, merge preview, sync log) plus native folder picker via the dialog plugin (ADR-0011).
