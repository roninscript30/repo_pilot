# Skill: Multi-Provider Strategy

## Purpose

Preserve a path to GitHub, GitLab, Forgejo, Gitea, and other Git-compatible services while delivering the GitHub-first MVP.

## Use When

- Designing provider integration code.
- Naming domain concepts that map to provider resources.
- Introducing persistence for provider-backed data.
- Adding features likely to exist differently across providers.

## Workflow

1. Read [../../architecture/provider-strategy.md](../../architecture/provider-strategy.md).
2. Identify which parts of the feature are truly provider-neutral and which are GitHub-specific.
3. Avoid broad abstractions before implementation pressure proves the boundary.
4. Isolate provider API clients, authentication, pagination, rate limits, permissions, and web URLs from core product workflows where practical.
5. Document provider-specific behavior that may not translate to other services.
6. Add an ADR before introducing a durable provider abstraction or cross-provider contract.

## Provider Difference Watchlist

- Pull request vs merge request terminology.
- GitHub Actions workflows vs GitLab pipelines and other CI systems.
- Organizations, groups, owners, namespaces, and projects.
- Permission models and repository visibility.
- Issue labels, milestones, projects, and discussions.
- Release and package models.
- API pagination, rate limits, tokens, and scopes.

## Quality Bar

- GitHub-first implementation remains understandable and shippable.
- Future providers are not blocked by unnecessary coupling.
- Abstractions are grounded in actual product and provider needs.

## Related

- [Provider Strategy](../../architecture/provider-strategy.md)
- [Provider Abstraction Design](../architecture/provider-abstraction-design.md)
- [Platform Direction Decision](../../architecture/decisions/ADR-0002-repository-operating-platform-direction.md)
