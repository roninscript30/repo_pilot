# Skill: Documentation And Knowledge Maintenance

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-06
Related: `../MANIFEST.md`, `../rules.md`, `../../AGENTS.md`

## Purpose

Keep the knowledge base useful, concise, and current.

## Maintenance Workflow

When completing meaningful work:

1. Update source code.
2. Validate the change.
3. Update affected feature, architecture, skill, or decision docs.
4. Update `project-memory/active-context.md` or `project-memory/implementation-log.md`.
5. Check `memory/README.md` if navigation changed.

## Writing Rules

- Keep docs practical.
- Avoid duplicating authoritative knowledge.
- Link related files instead of repeating content.
- Preserve useful history.
- Mark uncertain knowledge as draft or open question.
- Prefer short focused files over large monolithic files.

## When To Create An ADR

Create an ADR when a decision affects architecture, product direction, provider boundaries, data model, security model, development workflow, or long-term maintainability.
