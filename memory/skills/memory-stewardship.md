# Skill: Memory Stewardship

## Purpose

Keep project memory accurate, discoverable, and useful as implementation evolves.

## Use When

- Completing any significant feature, refactor, workflow change, or architecture change.
- Discovering constraints, bugs, patterns, or operational facts future contributors should know.
- Adding, moving, or deleting memory pages.

## Workflow

1. Start at [../../MEMORY.md](../../MEMORY.md).
2. Identify the authoritative page for the knowledge being changed.
3. Update that page instead of creating a duplicate note.
4. Add a decision record if the rationale should be preserved long term.
5. Update navigation links from relevant index pages.
6. Move temporary session context into [../agents/working-memory.md](../agents/working-memory.md) only when it helps future work.
7. Verify links in changed memory files.

## Quality Bar

- The next contributor can find the information without guessing file names.
- The memory explains why decisions were made, not only what exists.
- Stale placeholders are replaced as real implementation knowledge emerges.

## Related

- [Agent Rules](../agents/rules.md)
- [Decision Records](../architecture/decisions/index.md)
- [Templates](../templates/index.md)
