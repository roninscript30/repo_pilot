# Skill: Repository Insights

## Purpose

Guide future work that turns repository data into diagnostics, health analysis, engineering metrics, AI-assisted understanding, and operational insight.

## Use When

- Adding derived metrics or repository health signals.
- Designing diagnostics or release readiness checks.
- Building architecture visualization or AI-assisted repository understanding.
- Persisting or caching derived repository analysis.

## Workflow

1. Start from a concrete user question or operational need.
2. Identify source data and provider limitations.
3. Separate raw provider data from derived insight.
4. Make assumptions and confidence levels visible when analysis is incomplete.
5. Avoid presenting vanity metrics as operational truth.
6. Record calculation definitions, caveats, and data freshness rules.

## Insight Categories

- Repository health.
- Activity and maintenance signals.
- Contributor and collaboration patterns.
- Release readiness.
- Workflow reliability.
- Architecture and dependency understanding.
- Risk, conflict, or change impact analysis.

## Quality Bar

- Insights are explainable and traceable to source data.
- Users can understand what the platform knows, assumes, and does not know.
- Derived data does not leak provider-specific implementation details into product concepts unnecessarily.

## Related

- [Project Vision](../../project/vision.md)
- [Platform Architecture Direction](../../architecture/platform-direction.md)
- [Provider Strategy](../../architecture/provider-strategy.md)
