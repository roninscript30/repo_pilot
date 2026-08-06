# Skill: Git And Provider APIs

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-06
Related: `../architecture.md`, `../concepts.md`

## Purpose

Guide work involving Git and provider integrations.

## Principles

- Do not assume one provider represents all providers.
- Keep provider-specific API details behind adapters.
- Use provider-neutral domain concepts in product features.
- Preserve provider-specific edge cases in documentation.
- Respect rate limits, permissions, pagination, and partial failures.
- Treat authentication and tokens as sensitive data.

## Provider Concepts

Common provider capabilities include:

- Repositories
- Branches
- Commits
- Issues
- Pull or merge requests
- Releases
- Workflows or pipelines
- Users, teams, and permissions

## Git Concepts

Local Git integration should remain transparent. Users should understand when operations affect local state, remote state, branches, history, or working trees.

## Reference Sources

- Git documentation: https://git-scm.com/doc
- GitHub REST API: https://docs.github.com/en/rest
- GitHub GraphQL API: https://docs.github.com/en/graphql
- GitLab REST API: https://docs.gitlab.com/api/
- Forgejo API: https://forgejo.org/docs/latest/user/api-usage/
- Gitea API: https://docs.gitea.com/api/usage
