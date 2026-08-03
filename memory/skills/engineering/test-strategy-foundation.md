# Skill: Test Strategy Foundation

## Purpose

Establish testing expectations as the repository gains application code, provider integrations, desktop UI, and platform workflows.

## Use When

- Adding the first source code or build tooling.
- Implementing provider adapters.
- Adding UI workflows.
- Introducing persistence, authentication, synchronization, or derived insights.

## Workflow

1. Identify behavior boundaries: domain logic, provider integration, UI workflow, persistence, and operations.
2. Choose the lightest test type that gives useful confidence.
3. Prefer deterministic tests for domain logic and mapping code.
4. Mock provider APIs at clear boundaries instead of scattering network assumptions through tests.
5. Add integration tests for authentication, persistence, and provider workflows when tooling supports them.
6. Document exact commands in [../../engineering/workflows.md](../../engineering/workflows.md) and requirements in [../../engineering/quality-gates.md](../../engineering/quality-gates.md).

## Expected Test Layers

- Unit tests for domain logic and mapping.
- Adapter tests for provider API behavior.
- UI workflow tests for critical desktop flows.
- Integration tests for persistence and sync.
- End-to-end smoke tests for core MVP paths when feasible.

## Quality Bar

- Critical repository management workflows have meaningful coverage.
- Provider behavior is tested without relying on live network calls by default.
- Test commands are documented and easy for contributors to run.

## Related

- [Quality Gates](../../engineering/quality-gates.md)
- [Engineering Workflows](../../engineering/workflows.md)
- [GitHub MVP Delivery](../platform/github-mvp-delivery.md)
