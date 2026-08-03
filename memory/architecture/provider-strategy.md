# Provider Strategy

Last reviewed: 2026-08-03

## Strategy

GitHub is the first provider for the MVP. The long-term architecture should support GitHub, GitLab, Forgejo, Gitea, and other Git-compatible services.

The codebase should not treat GitHub as the permanent product domain. GitHub-specific behavior can exist inside a GitHub provider adapter, while the product should operate on provider-neutral concepts wherever practical.

## Provider-Neutral Concepts

Initial domain concepts likely include:

- Repository.
- Organization or owner.
- Branch.
- Issue.
- Pull request or merge request.
- Commit.
- Release.
- Workflow run or pipeline.
- Contributor.
- Repository metadata.

## Design Guidance

- Start with GitHub because the MVP requires it.
- Avoid inventing abstractions before at least one real provider integration exists.
- Keep GitHub API details at the boundary where possible.
- Promote stable provider-neutral concepts only after implementation pressure validates them.
- Record provider abstraction decisions as ADRs before they become hard to change.

## Known Risks

- Over-abstracting too early can slow MVP delivery.
- Under-abstracting can make future providers expensive.
- Provider vocabulary differs: pull requests, merge requests, workflows, pipelines, organizations, groups, and permissions are not always equivalent.

## Related

- [Initial MVP](../project/mvp.md)
- [Platform Architecture Direction](platform-direction.md)
- [Multi-Provider Strategy Skill](../skills/platform/multi-provider-strategy.md)
- [Provider Abstraction Design Skill](../skills/architecture/provider-abstraction-design.md)
