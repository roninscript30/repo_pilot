# Current State

Last reviewed: 2026-08-03

## Repository Snapshot

This repository is initialized as a Git repository for Repo Pilot, an open-source repository operating platform. It currently contains a simplified LLM-brain-style memory system, Obsidian vault configuration, product context, platform direction, and reusable project skills. No application source code, build system, runtime configuration, or user-facing documentation exists yet.

## Known Components

| Component | Status | Notes |
| --- | --- | --- |
| Project memory system | Initialized | Entry point: [../../MEMORY.md](../../MEMORY.md). Fast mental model: [../brain.md](../brain.md). |
| Obsidian vault | Initialized | Open the repository root in Obsidian. Vault usage is documented in [../engineering/obsidian-vault.md](../engineering/obsidian-vault.md). |
| Product context | Recorded | See [context.md](context.md), [vision.md](vision.md), and [mvp.md](mvp.md). |
| Skills library | Initialized | See [../skills/index.md](../skills/index.md), including platform, architecture, engineering, UI, and UX skills. |
| Application source | Not present | No source tree has been created yet. |
| Build/test tooling | Not present | No package manager, test runner, or CI configuration is present yet. |
| Runtime/deployment | Not present | No operational environment is defined yet. |

## Implications For Future Work

- The first implementation work should establish its own architecture, workflows, and quality gates in memory as they are created.
- Future agents should not infer technology stack choices from this memory system. Record actual choices once they exist.
- Product work should align with the repository operating platform vision rather than a narrow Git client or GitHub Desktop clone direction.
- When application code is introduced, update [../architecture/system-map.md](../architecture/system-map.md), [../engineering/workflows.md](../engineering/workflows.md), and relevant skills.
- Future UI/UX work should use [../skills/design/ui-master.md](../skills/design/ui-master.md), [../skills/design/ux-master.md](../skills/design/ux-master.md), and [../skills/design/workspace-information-architecture.md](../skills/design/workspace-information-architecture.md).

## Open Questions

- What language, framework, runtime, and deployment model will the project use?
- What quality gates should be required before changes are considered complete?
