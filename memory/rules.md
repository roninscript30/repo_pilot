# Engineering Rules

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-06

These rules are mandatory for contributors and AI agents.

## Core Rules

- Understand the project before changing it.
- Prefer simple, explicit, maintainable designs.
- Keep architecture modular and boundaries clear.
- Use strong typing wherever the technology stack supports it.
- Avoid hidden automation that prevents users from understanding repository operations.
- Introduce dependencies only when they provide meaningful long-term value.
- Do not optimize prematurely.
- Do not add abstractions without demonstrated need.
- Keep naming consistent across code, docs, and UI.
- Make behavior testable.

## Architecture Rules

- Features should evolve independently where possible.
- Provider-specific logic must not leak throughout the app.
- Desktop-first design should not block future offline and multi-provider support.
- UI components should not own business logic that belongs in application or domain layers.
- Integration code should be isolated behind clear interfaces.
- Long-term extensibility is preferred over short-term convenience.

## Documentation Rules

- Documentation is part of development, not a separate task.
- Update `memory/` when source code changes project knowledge.
- Significant decisions require ADRs in `memory/decisions/`.
- Feature behavior and status belong in `memory/features/README.md`.
- Reusable knowledge belongs in `memory/skills/`.
- Current context belongs in `memory/project-memory/active-context.md`.
- Historical progress belongs in `memory/project-memory/implementation-log.md`.

## AI Agent Rules

- Read `AGENTS.md` before meaningful work.
- Read the relevant memory files before editing.
- Preserve existing knowledge and extend it instead of replacing useful history.
- Update memory after meaningful changes.
- Do not leave important decisions only in chat history.
- If knowledge synchronization is skipped, explicitly explain why.

## Repository Standards

- Keep project organization clear.
- Keep module boundaries well-defined.
- Prefer readable code over clever code.
- Add automated checks as the implementation matures.
- Keep root-level files minimal and purposeful.
