# Roadmap

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-07

This roadmap is directional. It should evolve as architecture and implementation mature.

It is organized around the Repo Pilot product specification phases and updated after each meaningful implementation slice.

## Phase 0: Foundation (Complete)

- Project knowledge base
- Engineering rules
- Architecture direction
- Technology stack (ADR-0003)
- Provider boundary (ADR-0004)
- Authentication and secret storage (ADR-0005)
- Local Git engine seam (ADR-0006)
- Testing pipeline and CI (ADR-0007)
- Application skeleton: Vite + React + TypeScript strict + Tailwind
- Browser-preview mode and desktop (Tauri) shell
- Docker container for one-command project runs
- Vitest unit tests and Playwright e2e tests
- GitHub Actions CI (frontend, e2e, desktop shell)

## Phase 1: Repository Workspace (Partial)

- Repository browsing (available in browser and desktop)
- Repository overview (available in browser and desktop)
- Branch management (list/create/delete in Rust shell; compare + merge preview via `git_compare_refs` / `git_merge_preview`)
- Commit history (list/get in Rust shell; patch and line counts pending)
- Local repository metadata (worktree status: staged, unstaged, untracked, ignored, ahead/behind)
- Repository workspace (`/repo/:owner/:name/:activity`) with Git-engine activities — working tree, sync, branches, compare — available
- Git operations surface (stage, unstage, commit, create/delete branch available; file diff, ref compare, merge preview, sync log via dedicated commands; push, pull, fetch, restore, checkout, rename-branch, cherry-pick, revert, reset, tag, stash pending) behind the GitRuntime seam
- Authentication: GitHub fine-grained PAT flow (available)
- OAuth device flow (deferred follow-up)

## Phase 2: Collaboration Workflows

- Issue management
- Pull request management
- Contributor views
- Review workflow visibility
- Release management
- Authorization and permission validation per account session

## Phase 3: Operations and Visibility

- Workflow monitoring
- Repository diagnostics
- Repository health indicators
- Release readiness
- Engineering metrics

## Phase 4: Intelligence and Extensibility

- AI-assisted repository understanding
- Architecture visualization
- Dependency visualization
- Merge conflict analysis
- Repository sandbox (isolated temp repos, merge/rebase simulation)
- Plugin ecosystem
- Offline-first capabilities
- Multi-provider management
