# Repo Pilot Memory

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-11

This directory is the project's long-term knowledge base, engineering handbook, and AI memory system.

It is intentionally simple: a small set of authoritative documents, append-only project memory, reusable skills, feature knowledge, and architecture decisions.

## Start Here

- `../README.md` - public project introduction
- `../AGENTS.md` - mandatory AI contributor contract
- `MANIFEST.md` - how this knowledge base is organized
- `vision.md` - mission, product philosophy, and long-term direction
- `rules.md` - mandatory engineering and documentation rules
- `architecture.md` - architecture principles and target shape
- `concepts.md` - core project concepts and vocabulary
- `roadmap.md` - long-term product direction
- `status.md` - current implementation status

## Living Memory

- `project-memory/active-context.md` - current development context
- `project-memory/implementation-log.md` - chronological progress log
- `project-memory/lessons-learned.md` - durable lessons
- `project-memory/constraints.md` - known constraints
- `project-memory/technical-debt.md` - tracked debt and cleanup opportunities

## Knowledge Areas

- `features/catalog.md` - feature catalog and status
- `skills/index.md` - reusable engineering skill library
- `decisions/registry.md` - architecture decision records

## For AI Agents

This is a second brain, not an archive. `../AGENTS.md` defines the retrieval
protocol and a **task → memory routing table** — pick the 2–4 files for your
task from there instead of reading everything. Minimum reads before meaningful
work: this index, `../AGENTS.md`, `rules.md`, `vision.md`, `architecture.md`,
`project-memory/active-context.md`.

Current review state: `project-memory/code-review-2026-08-11-slice7.md` records
15 verified findings on commit `05fcc00`; fixable defects are tracked in
`project-memory/technical-debt.md` → "Code Review Follow-ups (Slice 7)". Check
both before touching tab persistence, repo sources, dashboard aggregation, the
GitHub mappers, or the worktree-diff path.

## Operating Principle

If source code changes what future contributors need to understand, update `memory/` in the same task.
