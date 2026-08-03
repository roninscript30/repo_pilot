# ADR-0002: Establish Repository Operating Platform Direction

Date: 2026-08-03

Status: Accepted

## Context

The project needs a durable product and architecture direction before implementation begins. The stated goal is to build an open-source modern repository operating platform for software developers, not another Git client or GitHub Desktop clone.

The first MVP focuses on GitHub repository management from a modern desktop interface, but the long-term vision includes multi-provider support across GitHub, GitLab, Forgejo, Gitea, and other Git-compatible services.

## Decision

The project will be guided by a repository operating platform direction:

- Build a unified engineering workspace for repository management, collaboration workflows, engineering insights, and repository operations.
- Deliver the initial MVP through GitHub authentication and GitHub repository management.
- Preserve a path toward modular multi-provider support.
- Treat extensibility, clean architecture, maintainability, and excellent developer experience as foundational constraints.

## Rationale

- The operating platform framing keeps the project broader than a Git UI or provider-specific repository viewer.
- GitHub-first MVP scope provides a practical starting point with clear user value.
- Multi-provider direction encourages explicit boundaries around provider integrations.
- Recording this decision now prevents future feature work from drifting toward a narrow GitHub-only clone.

## Consequences

- New features should be evaluated against the repository operating platform vision.
- GitHub-specific implementation should be isolated where practical.
- Provider-neutral domain concepts should emerge deliberately from implementation needs.
- Major technical choices should explain how they support maintainability, extensibility, and desktop developer experience.

## Related

- [Project Vision](../../project/vision.md)
- [Initial MVP](../../project/mvp.md)
- [Platform Architecture Direction](../platform-direction.md)
- [Provider Strategy](../provider-strategy.md)
