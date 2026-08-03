# ADR-0001: Establish Project Memory As The Repository Second Brain

Date: 2026-08-03

Status: Accepted

## Context

The repository needs a persistent memory system that preserves architectural knowledge, engineering decisions, development history, project philosophy, implementation context, operational knowledge, and AI agent continuity.

The repository currently has no application source code. This makes the memory system the first durable project structure and allows future implementation work to begin with clear knowledge stewardship rules.

## Decision

Create a modular project memory system with:

- A root navigation entry point at [../../../MEMORY.md](../../../MEMORY.md).
- Repository-level agent instructions at [../../../AGENTS.md](../../../AGENTS.md).
- Layered memory areas for project context, architecture, engineering, operations, agents, skills, and templates.
- Dedicated AI agent rules and working memory under [../../agents/](../../agents/).
- A reusable skills system under [../../skills/](../../skills/).
- Decision records under [./](./) for durable engineering rationale.

## Rationale

- A single root index makes the knowledge base discoverable for both humans and agents.
- Layered areas prevent the memory from becoming a flat notes folder.
- Dedicated agent memory creates continuity between AI development sessions.
- Decision records preserve rationale instead of forcing future contributors to rediscover past tradeoffs.
- Skills allow reusable workflows and project-specific capabilities to be maintained independently.

## Consequences

- Future significant work must include memory updates when new knowledge is created.
- Contributors must keep navigation and cross-links accurate.
- The memory system must evolve with the codebase and should be treated as part of engineering quality.
- As implementation appears, generic placeholders must be replaced with project-specific knowledge.

## Related

- [Project Memory Index](../../../MEMORY.md)
- [Agent Rules](../../agents/rules.md)
- [Skills Index](../../skills/index.md)
