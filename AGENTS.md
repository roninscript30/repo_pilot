# AI Contributor Contract

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-06

AI agents are engineering contributors to Repo Pilot. Every agent must preserve the repository's long-term memory and keep the knowledge base accurate.

## Required Before Work

Read these files before making meaningful changes:

- `memory/index.md`
- `memory/rules.md`
- `memory/vision.md`
- `memory/architecture.md`
- `memory/project-memory/active-context.md`

Also read any relevant files under:

- `memory/features/`
- `memory/skills/`
- `memory/decisions/`
- `memory/project-memory/`

## Required During Work

- Follow existing architecture and naming conventions.
- Prefer small, clear, maintainable changes.
- Avoid unnecessary abstractions.
- Record significant decisions as ADRs when the rationale matters long term.
- Reuse existing project knowledge before inventing new patterns.

## Required After Work

A task is not complete until implementation and knowledge are synchronized.

Update the knowledge base when work changes any of these:

- Project direction
- Architecture
- Feature behavior or status
- Engineering rules
- Known constraints
- Technical debt
- Reusable skills
- Development workflow
- Lessons learned

At minimum, update `memory/project-memory/active-context.md` or `memory/project-memory/implementation-log.md` after meaningful work.

## Maintenance Rule

Never treat `memory/` as optional documentation. It is the project's institutional memory and must evolve with the source code.
