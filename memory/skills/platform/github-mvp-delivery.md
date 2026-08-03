# Skill: GitHub MVP Delivery

## Purpose

Guide implementation of the initial GitHub repository management MVP while preserving the long-term repository operating platform direction.

## Use When

- Implementing GitHub authentication.
- Building repository browsing, overview, branch, issue, pull request, commit, release, workflow, metadata, or contributor features.
- Prioritizing MVP scope.
- Reviewing whether a GitHub-specific implementation is acceptable.

## Workflow

1. Read [../../project/mvp.md](../../project/mvp.md) and [../../project/vision.md](../../project/vision.md).
2. Identify whether the feature is a provider capability, product workflow, or derived repository insight.
3. Keep GitHub API details at the integration boundary where practical.
4. Model user-facing behavior in product terms, not only GitHub API response terms.
5. Choose the smallest implementation that supports the MVP without blocking future provider support.
6. Record new constraints, API discoveries, and architectural decisions in memory.

## MVP Feature Checklist

- Repository browsing.
- Repository overview.
- Branch management.
- Issue management.
- Pull request management.
- Commit history visualization.
- Release management.
- Workflow status visualization.
- Repository metadata.
- Contributor information.

## Quality Bar

- The feature improves repository operation from a desktop engineering workspace.
- GitHub-specific assumptions are explicit and isolated where reasonable.
- The implementation does not drift toward a thin API viewer.
- New provider or domain knowledge is recorded.

## Related

- [Initial MVP](../../project/mvp.md)
- [Provider Strategy](../../architecture/provider-strategy.md)
- [Platform Architecture Direction](../../architecture/platform-direction.md)
- [Repository Operating Platform Product](repository-operating-platform-product.md)
