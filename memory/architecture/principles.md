# Architecture Principles

These principles guide architecture until more implementation-specific constraints emerge. Refine them as concrete technical decisions are made.

## Principles

- Prefer simple designs with clear ownership boundaries.
- Build a repository operating platform, not a narrow Git client or GitHub Desktop clone.
- Design for GitHub-first delivery without making GitHub the permanent domain model.
- Keep provider integrations modular and explicit.
- Record durable architectural choices as decision records.
- Keep authoritative knowledge in one place and link to it elsewhere.
- Avoid premature compatibility layers unless there is an actual external contract, persisted data, shipped behavior, or explicit requirement.
- Optimize for maintainability and clear evolution over cleverness.
- Keep implementation and memory synchronized.

## Open Principle Gaps

- Runtime, deployment, security, data, and integration constraints are not known yet.
- Performance and reliability requirements are not known yet.
