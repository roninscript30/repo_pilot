# Skill: Decision Recording

## Purpose

Capture durable engineering decisions so future contributors understand the rationale and constraints behind the project direction.

## Use When

- Selecting a language, framework, package manager, database, cloud service, or deployment model.
- Defining a module boundary, public contract, data model, or integration pattern.
- Choosing a testing, release, security, or operational strategy.
- Making a tradeoff that future contributors may otherwise reverse without context.

## Workflow

1. Copy the structure from [../templates/decision-record.md](../templates/decision-record.md).
2. Add a new file under [../architecture/decisions/](../architecture/decisions/) using the next ADR number.
3. Record context, decision, rationale, consequences, and related links.
4. Add the decision to [../architecture/decisions/index.md](../architecture/decisions/index.md).
5. Link the decision from relevant architecture, engineering, operations, or project pages.

## Quality Bar

- The record explains why the decision was made.
- Alternatives or tradeoffs are explicit when relevant.
- Consequences and future constraints are clear.
- The decision is easy to discover from the memory index.

## Related

- [Architecture Decisions](../architecture/decisions/index.md)
- [Decision Template](../templates/decision-record.md)
