# Architecture

Status: Draft
Owner: Project Maintainers
Last Updated: 2026-08-06

Repo Pilot is currently at project initialization stage. This document defines target architecture principles that future implementation should follow.

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
