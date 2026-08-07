# Feature Catalog

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-07

This catalog tracks planned product areas and their current status. Split a feature into its own file only when implementation details outgrow this index.

## Status Values

- Planned: known capability, not implemented
- Designing: actively being specified
- Building: implementation underway
- Available: usable in the application
- Deferred: intentionally postponed

## Planned Features

| Feature | Status | Purpose |
| --- | --- | --- |
| Repository browsing | Available | Browse local and remote repositories. |
| Repository overview | Available | Summarize repository state, activity, and health signals. |
| Branch management | Building | View, compare, create, and manage branches safely. List/create/delete wired in the Rust shell; compare + merge preview via `git_compare_refs` / `git_merge_preview`. |
| Commit history | Building | Explore repository history and contribution flow. List/get wired in the Rust shell; patch and line-count fidelity pending. |
| Local repository operations | Building | Worktree status (full shape) plus stage/unstage/commit/create-branch/delete-branch, file diff, ref compare, merge preview, and sync log in the Rust shell; push/pull/fetch/restore/checkout/rename-branch/stash/reset/tag/cherry-pick/revert reported as unsupported. |
| Authentication (PAT) | Available | GitHub fine-grained PAT with scope validation; OS keyring on desktop, in-memory in browser preview. |
| OAuth device flow | Deferred | Planned follow-up for smoother sign-in. |
| Issue management | Available | Workspace IssuesTab with state filter and create-issue dialog. |
| Pull request management | Available | Workspace PullsTab with state filter and files/commits/reviews detail tabs. |
| Release management | Available | Workspace ReleasesTab with notes rendering and asset downloads. |
| Workflow monitoring | Planned | Show CI, automation, and operational workflows. |
| Contributor management | Planned | Understand contributors, activity, ownership, and collaboration. |
| Repository diagnostics | Planned | Detect common repository problems and risks. |
| Repository analytics | Planned | Provide engineering metrics and trends. |
| AI-assisted workflows | Planned | Help users understand repositories and decisions without hiding operations. |
| Plugin ecosystem | Planned | Allow future external capabilities. |
| Offline support | Planned | Support local-first workflows where possible. |
| Multi-provider support | Planned | Support GitHub, GitLab, Forgejo, Gitea, and other Git-compatible services. |

## Feature Documentation Rule

When a feature enters design or implementation, update this catalog and add a dedicated feature file if needed.
