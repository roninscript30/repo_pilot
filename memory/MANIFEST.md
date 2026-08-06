# Knowledge Base Manifest

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-06

This manifest defines where knowledge belongs so the memory system stays clean.

## Purpose

`memory/` preserves knowledge that source code alone cannot communicate:

- Vision and product direction
- Architecture and design rationale
- Engineering rules
- Project concepts
- Implementation history
- Reusable engineering skills
- Known constraints and technical debt

## Placement Rules

- Put stable project direction in `vision.md`.
- Put mandatory engineering rules in `rules.md`.
- Put system structure and architecture principles in `architecture.md`.
- Put domain language and product concepts in `concepts.md`.
- Put feature status and behavior expectations in `features/README.md`.
- Put reusable how-to knowledge in `skills/`.
- Put historical project context in `project-memory/`.
- Put significant decisions in `decisions/` as ADRs.

## Duplication Rule

Each fact should have one authoritative home. Other documents should link to it instead of copying it.

## Update Rule

Prefer extending existing documents over creating new ones unless a new document creates a clearer long-term boundary.

## LLM Wiki Principles

- Keep documents easy to scan.
- Put the most important information first.
- Use explicit links between related topics.
- Maintain clear file names and stable locations.
- Preserve historical knowledge instead of rewriting it away.

## Open Knowledge Framework Principles

- Every important knowledge area has a clear owner field.
- Every document has a status.
- Knowledge is maintained through the development workflow, not as a separate cleanup phase.
- Active knowledge and historical memory are separated.
