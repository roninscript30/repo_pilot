# Initial MVP

Last reviewed: 2026-08-03

## MVP Goal

The first version focuses on repository management through GitHub. Users authenticate with GitHub and manage repositories from a modern desktop interface.

The MVP should establish a solid engineering foundation before advanced capabilities are introduced.

## Core Capabilities

| Capability | MVP Intent |
| --- | --- |
| Repository browsing | Let users discover and navigate accessible GitHub repositories. |
| Repository overview | Show useful summary information for a selected repository. |
| Branch management | Support understanding and managing repository branches. |
| Issue management | Support viewing and working with GitHub issues. |
| Pull request management | Support reviewing PR status and collaboration workflows. |
| Commit history visualization | Help users understand repository history and activity. |
| Release management | Surface releases and release-related metadata. |
| Workflow status visualization | Show GitHub Actions or workflow status where available. |
| Repository metadata | Present stars, forks, visibility, topics, license, and other metadata. |
| Contributor information | Show contributors and contribution-related context. |

## MVP Constraints

- GitHub is the first provider, but architecture should avoid making GitHub the permanent domain model.
- Desktop interface quality matters; the product should feel like an engineering workspace, not a thin API viewer.
- Foundation quality is more important than breadth of advanced features.
- Provider integration should be designed so future providers can be added deliberately.

## Out Of Scope For Initial MVP

- Full local Git replacement.
- Full offline repository operation.
- Plugin ecosystem.
- Multi-provider production support.
- Advanced AI-assisted repository understanding.

## Related

- [Project Vision](vision.md)
- [Platform Direction Decision](../architecture/decisions/ADR-0002-repository-operating-platform-direction.md)
- [Provider Strategy](../architecture/provider-strategy.md)
- [GitHub MVP Skill](../skills/platform/github-mvp-delivery.md)
