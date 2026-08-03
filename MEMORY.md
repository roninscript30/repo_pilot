# Repo Pilot Memory

This is the project brain for Repo Pilot: an open-source repository operating platform for software developers and maintainers.

Repo Pilot is not another Git client, GitHub Desktop clone, or thin API viewer. It should become a unified desktop engineering workspace for managing, understanding, and operating repositories across GitHub first, then GitLab, Forgejo, Gitea, and other Git-compatible services.

## Start Here

| Need | Open |
| --- | --- |
| Fast mental model | [memory/brain.md](memory/brain.md) |
| Project intro and context | [memory/project/context.md](memory/project/context.md) |
| MVP scope | [memory/project/mvp.md](memory/project/mvp.md) |
| Current state | [memory/project/current-state.md](memory/project/current-state.md) |
| Architecture direction | [memory/architecture/platform-direction.md](memory/architecture/platform-direction.md) |
| Provider strategy | [memory/architecture/provider-strategy.md](memory/architecture/provider-strategy.md) |
| Skills | [memory/skills/index.md](memory/skills/index.md) |
| Agent handoff | [memory/agents/working-memory.md](memory/agents/working-memory.md) |
| Agent rules | [memory/agents/rules.md](memory/agents/rules.md) |

## Brain Rules

1. Read [memory/brain.md](memory/brain.md) before significant work.
2. Use the relevant skill from [memory/skills/index.md](memory/skills/index.md).
3. Update memory when implementation creates new knowledge.
4. Record durable decisions in [memory/architecture/decisions/index.md](memory/architecture/decisions/index.md).
5. Keep links accurate and avoid duplicate notes.

## Obsidian Vault

This repository is an Obsidian vault. Open the repository root in Obsidian and start from this file or [memory/brain.md](memory/brain.md). Vault configuration lives in `.obsidian/`, templates point to [memory/templates/](memory/templates/), and memory attachments should live in [memory/assets/](memory/assets/).

## Required Agent Rules

Every AI agent working in this repository must follow [memory/agents/rules.md](memory/agents/rules.md). Updating project memory is part of completing engineering work, not an optional cleanup task.

## Current Project Snapshot

The first MVP focuses on GitHub repository management from a modern desktop interface while preserving a long-term multi-provider architecture. See [memory/project/context.md](memory/project/context.md), [memory/project/vision.md](memory/project/vision.md), and [memory/project/mvp.md](memory/project/mvp.md).

## Decision Log

Architectural and durable engineering decisions are recorded in [memory/architecture/decisions/index.md](memory/architecture/decisions/index.md).

Current decisions:

| ID | Title | Status |
| --- | --- | --- |
| [ADR-0001](memory/architecture/decisions/ADR-0001-project-memory-system.md) | Establish project memory as the repository second brain | Accepted |
| [ADR-0002](memory/architecture/decisions/ADR-0002-repository-operating-platform-direction.md) | Establish repository operating platform direction | Accepted |

## Maintenance Rules

- Keep this index accurate when pages are added, moved, or retired.
- Link from broad overview pages to detailed pages instead of duplicating content.
- Record durable rationale in decision records.
- Record short-lived implementation status in agent working memory, then promote lasting insights to the appropriate knowledge area.
- Keep memory close to implementation reality. If code changes invalidate memory, update the memory in the same change.
