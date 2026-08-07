# ADR-0004: Provider Boundary And GitHub Rest Adapter

Status: Accepted
Date: 2026-08-06

## Context

Repo Pilot (product name: Repo Pilot) will support GitHub, GitLab, Forgejo, Gitea, Bitbucket, and Azure DevOps over time. Provider-specific logic must not leak throughout the application (engineering rule: "Provider-specific logic must not leak throughout the app").

## Decision

Define a provider-neutral capability layer in TypeScript with a `Provider` interface. Features depend only on neutral capabilities: repositories, branches, pull requests, issues, releases, users, permissions.

The first adapter is a GitHub adapter backed by GitHub REST through a thin typed fetch client. GraphQL is reserved for later capabilities (e.g., the commit graph) where REST is insufficient.

The provider-neutral layer lives in `src/domain/` (models + ports) and the GitHub adapter in `src/providers/github/`.

## Rationale

- Keeps features decoupled from any single provider.
- A thin typed fetch client avoids heavyweight SDK lock-in and keeps HTTP details inspectable.
- REST first: fine-grained access tokens work with REST, and REST covers the Phase 1 feature set.
- GraphQL can be added behind the same seam when the commit graph requires it.

## Alternatives Considered

- Official GitHub SDK: adds a heavyweight dependency and couples models to SDK types.
- GraphQL only: overkill for CRUD-heavy Phase 1 features and complicates PAT scoping.
- Direct provider calls from UI: violates the separation of concerns rule.

## Consequences

- All provider calls flow through the `Provider` port; features never import a GitHub-specific type unless isolated behind an adapter.
- Token validation checks scopes against the provider before account sessions are stored.
- Adding a second provider means writing one adapter, not touching features.

## Follow-ups

- Define the full `Provider` port surface during the auth and repository browser slices.
- Document provider-specific behavior in `memory/skills/git-provider-apis.md`.
