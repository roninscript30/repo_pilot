# Permanent Rules For AI Agents

Every AI agent contributing to this repository must follow these rules.

## Core Rules

- Treat the project memory system as the project's second brain.
- Read the relevant memory before making significant changes.
- Update memory whenever new durable knowledge is created.
- Record architectural decisions and their rationale.
- Record important discoveries instead of relying on future rediscovery.
- Keep navigation accurate when documentation changes.
- Prefer extending existing knowledge instead of creating duplicate information.
- Preserve historical context whenever possible.
- Keep documentation synchronized with implementation.
- Leave the project in a better documented state than it was found.

## Completion Rule

Updating project memory is part of completing development work. A change that creates durable project knowledge is incomplete until the memory system reflects that knowledge.

## Placement Rules

- Put current implementation status, handoffs, blockers, assumptions, and session continuity in [working-memory.md](working-memory.md).
- Put durable architecture rationale in [../architecture/decisions/](../architecture/decisions/).
- Put current system structure in [../architecture/system-map.md](../architecture/system-map.md).
- Put development commands and workflows in [../engineering/workflows.md](../engineering/workflows.md).
- Put reusable procedures and domain capabilities in [../skills/](../skills/).
- Put operational procedures in [../operations/runbooks.md](../operations/runbooks.md).

## Anti-Patterns

- Do not create disconnected notes when an authoritative page already exists.
- Do not duplicate the same fact across multiple files. Link to the source instead.
- Do not leave stale navigation after adding, moving, or deleting pages.
- Do not record secrets or private credentials in memory.
- Do not treat agent memory as temporary scratch space. Preserve useful context or remove noise.
