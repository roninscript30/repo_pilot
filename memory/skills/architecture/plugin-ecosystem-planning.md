# Skill: Plugin Ecosystem Planning

## Purpose

Keep future plugin extensibility in view without building a plugin system before the platform has stable primitives.

## Use When

- Defining extension points.
- Designing internal APIs that may later become public plugin APIs.
- Adding workflows that could be generalized for third-party integrations.
- Considering customization or automation capabilities.

## Workflow

1. Confirm whether plugin support is actually needed now or only a future constraint.
2. Keep internal boundaries clean enough that extension points can emerge later.
3. Avoid exposing unstable internal concepts as public contracts too early.
4. Record potential extension points in memory when discovered.
5. Add an ADR before committing to plugin runtime, permissions, API shape, or compatibility promises.

## Potential Future Extension Points

- Repository diagnostics.
- Custom insights or metrics.
- Provider integrations.
- Workflow automation.
- Architecture visualization.
- Release readiness checks.

## Quality Bar

- The platform remains extensible by design but not burdened by speculative plugin infrastructure.
- Future plugin decisions have a trail of observed extension needs.

## Related

- [Project Vision](../../project/vision.md)
- [Platform Architecture Direction](../../architecture/platform-direction.md)
- [Decision Recording](../decision-recording.md)
