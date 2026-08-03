# Skill: Provider Abstraction Design

## Purpose

Design provider boundaries that support GitHub-first delivery and future multi-provider support without premature over-abstraction.

## Use When

- Creating provider clients or adapters.
- Mapping provider API responses into product/domain concepts.
- Designing authentication, authorization, pagination, rate limit, or error handling boundaries.
- Introducing provider-neutral interfaces.

## Workflow

1. Identify the real product workflow being served.
2. Keep raw provider API types near the provider boundary.
3. Introduce provider-neutral concepts only where the product needs them.
4. Preserve provider-specific capabilities when they are meaningful instead of hiding everything behind a lowest-common-denominator interface.
5. Treat authentication, rate limits, scopes, and permissions as first-class constraints.
6. Record durable abstraction choices in an ADR.

## Design Heuristics

- Prefer adapters over global provider conditionals.
- Prefer explicit capability checks over assuming every provider supports every workflow.
- Avoid naming core domain concepts after GitHub-specific API names unless the concept is truly GitHub-specific.
- Keep provider error handling understandable to users.

## Quality Bar

- The MVP remains easy to ship.
- Provider boundaries are visible in code and memory.
- Future providers can be evaluated without rewriting product workflows unnecessarily.

## Related

- [Provider Strategy](../../architecture/provider-strategy.md)
- [Multi-Provider Strategy](../platform/multi-provider-strategy.md)
- [Decision Recording](../decision-recording.md)
