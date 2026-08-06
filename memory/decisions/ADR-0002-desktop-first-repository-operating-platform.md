# ADR-0002: Desktop-First Repository Operating Platform

Status: Accepted
Date: 2026-08-06

## Context

The project could be interpreted as a Git client, repository viewer, or GitHub Desktop replacement. That interpretation is too narrow for the long-term product vision.

## Decision

Repo Pilot will be developed as a desktop-first Repository Operating Platform.

It will support Git and provider workflows, but its goal is a broader engineering workspace for repository operations, collaboration, diagnostics, analytics, automation, and intelligence.

## Rationale

- Keeps product direction broader than Git commands.
- Supports multi-provider workflows.
- Allows future repository health, analytics, and AI-assisted capabilities.
- Encourages modular platform architecture.

## Alternatives Considered

- Build a Git client: rejected as too narrow.
- Build a GitHub Desktop clone: rejected because the project must support multiple providers and broader repository operations.
- Build a web-only dashboard: rejected because local repository and desktop workflows are core to the vision.

## Consequences

- Architecture must support local and remote repository concepts.
- Provider integrations must be abstracted.
- UI should expose repository operations transparently.
- Feature work should be evaluated against platform value, not only Git convenience.
