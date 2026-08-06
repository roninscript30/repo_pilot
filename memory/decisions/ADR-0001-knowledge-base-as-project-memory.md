# ADR-0001: Knowledge Base As Project Memory

Status: Accepted
Date: 2026-08-06

## Context

Repo Pilot is intended to become a long-lived open-source engineering platform. Source code alone cannot preserve product vision, design rationale, constraints, lessons learned, and contributor expectations.

AI agents will also contribute to the repository, so project knowledge must survive beyond individual conversations.

## Decision

The repository will maintain `memory/` as a first-class project knowledge base and AI memory system.

Updating relevant knowledge is part of completing meaningful development work.

## Rationale

- Preserves institutional knowledge.
- Reduces repeated reasoning by future contributors and agents.
- Creates a single source of truth for non-code knowledge.
- Makes AI collaboration safer and more consistent.
- Supports long-term maintainability.

## Alternatives Considered

- Use only a `docs/` folder: rejected because the goal is a living memory system, not static documentation.
- Rely on issues and pull requests: rejected because project knowledge becomes scattered.
- Rely on AI chat history: rejected because it is not durable or repository-local.

## Consequences

- Contributors must update memory when project knowledge changes.
- AI agents must read and maintain memory.
- The repository gains a durable engineering handbook from the beginning.

## Follow-ups

- Keep the memory structure simple.
- Avoid duplicate knowledge.
- Add new skill files only when reusable knowledge deserves a stable home.
