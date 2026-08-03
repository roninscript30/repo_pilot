# Platform Architecture Direction

Last reviewed: 2026-08-03

## Direction

The project should evolve as a repository operating platform: a desktop engineering workspace that manages, understands, and operates repositories across provider ecosystems.

No implementation architecture has been selected yet. This page captures target direction that future technical choices should support.

## Architectural Goals

- Keep provider integrations modular.
- Separate product domain concepts from provider API shapes.
- Support repository browsing, collaboration workflows, metadata, history, releases, workflow status, and contributor information as cohesive workspace capabilities.
- Leave room for repository diagnostics, health analysis, insights, AI-assisted understanding, plugins, offline capabilities, and local Git integration.
- Prefer explicit boundaries over hidden coupling.
- Establish production-quality testing and maintainability standards early.

## Expected Future Layers

| Layer | Responsibility |
| --- | --- |
| Desktop shell | Application windowing, navigation, workspace layout, platform integration. |
| Product experience | Repository workspace screens, state transitions, and user workflows. |
| Domain model | Provider-neutral repository, branch, issue, pull request, commit, release, workflow, and contributor concepts. |
| Provider adapters | GitHub first, later GitLab, Forgejo, Gitea, and other Git-compatible services. |
| Data/cache layer | Local persistence, synchronization, offline-read support, and derived insight storage when introduced. |
| Operations/insights layer | Diagnostics, health analysis, metrics, release readiness, AI-assisted understanding, and architecture visualization. |

## Current Constraints

- No language, desktop framework, storage engine, provider SDK, or state management approach has been selected.
- GitHub is the first provider, but future implementation should avoid leaking GitHub-specific shapes into the core domain without an explicit reason.

## Related

- [Project Vision](../project/vision.md)
- [Initial MVP](../project/mvp.md)
- [Provider Strategy](provider-strategy.md)
- [Platform Direction Decision](decisions/ADR-0002-repository-operating-platform-direction.md)
