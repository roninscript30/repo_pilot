# AI Contributor Contract

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-06

AI agents are engineering contributors to Repo Pilot. Every agent must preserve the repository's long-term memory and keep the knowledge base accurate.

## Required Before Work

Read these files before making meaningful changes:

- `memory/index.md`
- `memory/rules.md`
- `memory/vision.md`
- `memory/architecture.md`
- `memory/project-memory/active-context.md`

Also read any relevant files under:

- `memory/features/`
- `memory/skills/`
- `memory/decisions/`
- `memory/project-memory/`

## Second Brain: How to Use This Memory Base

`memory/` is the project's second brain — it stores what the code alone cannot
say (decisions, constraints, history, debt, reviewed findings). Use it as a
routing layer, not an archive to skim.

### Retrieval protocol

1. **Start at the map.** Read `memory/index.md` (start-here pointers) and `memory/MANIFEST.md` (placement rules). They tell you which file owns the knowledge you need.
2. **Route by task, not by reading everything.** Use the table below to pick the 2–4 files that matter for your change. Reading the wrong 4 files wastes more than reading none.
3. **Read, don't skim.** Active context, ADRs, and skills contain hard-won detail (pinned-API quirks, `exactOptionalPropertyTypes` rules, UI-kit constraints) that skimming misses.
4. **Follow links.** Cross-document links (`[[name]]` or relative paths) point at the authoritative home of a fact. The duplication rule says each fact has one home — link to it instead of re-deriving it.
5. **Check debt and reviews last.** Before touching a subsystem, check `memory/project-memory/technical-debt.md` ("Code Review Follow-ups") and the newest `memory/project-memory/code-review-*.md` for known defects in that area so you fix, not re-introduce, them.

### Task → memory routing

| If you are about to… | Read first |
|---|---|
| Touch the Git engine / Rust shell (`src-tauri/`, gix, system git, worktree diff) | ADR-0013/0014/0015, `skills/tauri-rust.md`, the gix-0.68 cheat-sheet in `project-memory/implementation-log.md`, `technical-debt.md` worktree-diff note |
| Add or change a provider / provider method (GitHub or future) | ADR-0004, ADR-0012, `skills/git-provider-apis.md`, `features/catalog.md`, the `contributions` mapper finding in `code-review-2026-08-11-slice7.md` |
| Change tab persistence, `AppShell`, or the workspace shell | ADR-0016, `code-review-2026-08-11-slice7.md` (P1 #1/#2/#4), `technical-debt.md` follow-ups |
| Change repo sources, dashboard aggregation, or "Sync all" | ADR-0016, `code-review-2026-08-11-slice7.md` (P2 #5–#8), `technical-debt.md` follow-ups |
| Build/change UI or a component | `skills/frontend-ui.md`, `skills/react-typescript.md`, the UI-kit constraints in `project-memory/active-context.md` |
| Add or change tests | `skills/testing-quality.md`, ADR-0007, the e2e-hermeticity finding (`e2e/signin.spec.ts`) |
| Touch auth, secrets, or storage | ADR-0005, ADR-0012 |
| Change product direction / architecture | `vision.md`, `roadmap.md`, `architecture.md`, `concepts.md` — and record an ADR for the decision |
| Change feature behavior or status | `features/catalog.md` (behavior/status lives here) |

### Update protocol (second-brain hygiene)

- Each fact has **one authoritative home**; extend that file rather than duplicating.
- A task is done only when implementation **and** knowledge are synchronized (see "Required After Work").
- If you close a code-review follow-up, delete its `technical-debt.md` bullet and note the fixing commit in `project-memory/implementation-log.md`.

## Required During Work

- Follow existing architecture and naming conventions.
- Prefer small, clear, maintainable changes.
- Avoid unnecessary abstractions.
- Record significant decisions as ADRs when the rationale matters long term.
- Reuse existing project knowledge before inventing new patterns.

## Required After Work

A task is not complete until implementation and knowledge are synchronized.

Update the knowledge base when work changes any of these:

- Project direction
- Architecture
- Feature behavior or status
- Engineering rules
- Known constraints
- Technical debt
- Reusable skills
- Development workflow
- Lessons learned

At minimum, update `memory/project-memory/active-context.md` or `memory/project-memory/implementation-log.md` after meaningful work.

## Maintenance Rule

Never treat `memory/` as optional documentation. It is the project's institutional memory and must evolve with the source code.
