# Skill: Workspace Information Architecture

## Purpose

Organize repository information so the desktop workspace is easy to navigate and scales from simple repositories to complex organizations.

## Use When

- Designing navigation.
- Grouping repository features.
- Creating repository overview pages.
- Deciding where branches, issues, PRs, commits, releases, workflows, metadata, and contributors belong.

## Workflow

1. Establish the workspace hierarchy: provider, account or organization, repository, section, entity, detail.
2. Keep global navigation, repository navigation, and detail navigation distinct.
3. Put high-signal repository state in overview surfaces.
4. Keep collaboration entities together when workflows overlap: issues, PRs, reviewers, labels, milestones, and contributors.
5. Keep operations entities together when workflows overlap: releases, workflows, branches, status, health, diagnostics.
6. Record navigation decisions when they become product architecture.

## Suggested MVP Navigation Groups

- Repositories.
- Overview.
- Code activity: branches and commits.
- Collaboration: issues and pull requests.
- Delivery: releases and workflows.
- People: contributors.
- Metadata and settings.

## Quality Bar

- Users can predict where information lives.
- The same repository context is not duplicated across many unrelated screens.
- The structure leaves room for future diagnostics, insights, and providers.

## Related

- [UI Master](ui-master.md)
- [UX Master](ux-master.md)
- [Platform Architecture Direction](../../architecture/platform-direction.md)
