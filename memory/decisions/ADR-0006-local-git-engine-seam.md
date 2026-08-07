# ADR-0006: Local Git Engine Seam

Status: Accepted
Date: 2026-08-06

## Context

Repo Pilot must expose Git operations visually (commit, push, pull, fetch, stage, branch management, cherry-pick, rebase, stash, tags, and the repository sandbox). The desktop shell needs a local Git engine, and the sandbox must execute real Git operations inside isolated repositories.

## Decision

Use **gitoxide (gix)** as the local Git engine behind a `GitRuntime` seam.

- The frontend speaks to the `GitRuntime` port (TypeScript interface).
- The Tauri backend implements the port using `gix`, exposed through Tauri commands.
- A browser-preview implementation of the port returns a transparent "requires desktop runtime" result instead of failing silently, keeping the UI fully testable in web mode.
- The sandbox creates temporary repositories and disposable branches via the same seam.

## Rationale

- gitoxide is a pure-Rust, safe, actively maintained Git implementation with no C toolchain dependency (libgit2 requires C).
- Keeps the Rust backend dependency-light and auditable.
- The `GitRuntime` port keeps Git engine details behind an interface, satisfying dependency inversion.
- Real Git operations in isolated sandbox repositories satisfy the "execute real Git operations when possible" requirement.

## Alternatives Considered

- libgit2 (git2 crate): mature but pulls a C toolchain and vendored C sources; less aligned with a pure-Rust backend.
- Shelling out to the system `git` binary: simpler but couples behavior to user-installed git versions and is harder to sandbox safely across platforms.

## Consequences

- All Git operations flow through `GitRuntime`; no UI component executes Git directly.
- Sandbox execution is isolated and disposable by construction.
- gitoxide APIs may need feature-gating; we enable only the features Repo Pilot needs.

## Follow-ups

- Lock the gix dependency version and the enabled feature set during the Tauri shell slice.
- Add a sandbox capability test that creates a temp repo, makes commits, and replays history.
