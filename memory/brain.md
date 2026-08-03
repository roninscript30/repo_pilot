# LLM Brain

This is the compact mental model for future agents and contributors. Read this first when you need the project in your head quickly.

## Identity

Repo Pilot is an open-source repository operating platform for software developers and maintainers.

It is not a Git client clone, a GitHub Desktop clone, or a thin GitHub API viewer. It should become a unified engineering workspace for managing, understanding, and operating repositories.

## North Star

Help developers and maintainers manage repositories, collaborate efficiently, understand complex projects, and operate software development workflows from one cohesive desktop workspace.

## First Milestone

Ship a GitHub-focused desktop MVP with repository browsing, overview, branches, issues, pull requests, commit history, releases, workflow status, metadata, and contributors.

## Long-Term Shape

The platform should support multiple providers over time: GitHub first, then GitLab, Forgejo, Gitea, and other Git-compatible services.

Future platform areas include diagnostics, health analysis, engineering metrics, AI-assisted understanding, architecture visualization, release readiness, plugins, offline capability, and local Git integration.

## How To Think

- Ship GitHub first, but do not hard-code GitHub as the permanent product model.
- Prefer simple architecture with explicit boundaries.
- Build workspace workflows, not disconnected data screens.
- Turn repository data into operational context.
- Keep implementation, decisions, and memory synchronized.
- Leave the repository easier for the next contributor to understand.

## Fast Links

| Need | Go To |
| --- | --- |
| Project context | [project/context.md](project/context.md) |
| MVP scope | [project/mvp.md](project/mvp.md) |
| Architecture direction | [architecture/platform-direction.md](architecture/platform-direction.md) |
| Provider strategy | [architecture/provider-strategy.md](architecture/provider-strategy.md) |
| Skills | [skills/index.md](skills/index.md) |
| Agent rules | [agents/rules.md](agents/rules.md) |
| Current handoff | [agents/working-memory.md](agents/working-memory.md) |
| Decisions | [architecture/decisions/index.md](architecture/decisions/index.md) |
