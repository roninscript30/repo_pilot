# Obsidian Vault

Last reviewed: 2026-08-03

## Purpose

The repository root is an Obsidian vault so humans and agents can browse the project memory as a linked knowledge graph.

## Vault Entry Points

| Entry | Purpose |
| --- | --- |
| [../../MEMORY.md](../../MEMORY.md) | Primary memory index and recommended home note. |
| [../project/vision.md](../project/vision.md) | Product vision and strategic boundaries. |
| [../skills/index.md](../skills/index.md) | Skills library. |

## Configuration

Tracked vault configuration lives in `.obsidian/` and enables core plugins for graph view, backlinks, outgoing links, search, templates, bookmarks, and properties.

Templates are configured to use [../templates/](../templates/). Attachments should be stored in [../assets/](../assets/).

## Local State

Obsidian workspace state is intentionally ignored by Git through `.gitignore` because it changes per user and machine.

## Maintenance Rules

- Keep standard Markdown links working; they are compatible with GitHub and Obsidian.
- Prefer explicit links between related memory pages so graph view remains useful.
- Store diagrams, screenshots, and other attachments under [../assets/](../assets/).
- Do not store secrets in the vault.
