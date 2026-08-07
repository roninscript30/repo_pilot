# Technical Debt

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-07

## Current Debt

- gitoxide is pinned to gix 0.68.0 (latest available when the shell was written). The Rust code targets this pinned API, so upgrading gix is a deliberate, effortful change (the first implementation was written against a newer API and did not compile).
- Unsupported GitRuntime operations (push, pull, fetch, restore, checkout, rename-branch, cherry-pick, revert, reset, tag, stash, compare-branches) return `unsupported: true` from the Rust shell. The UI handles this gracefully (amber warning), but the operation surface is incomplete for Phase 1.
- Commit detail fidelity is reduced in the Rust shell: file change line counts are 0, and the patch is None (tree diff produces paths and statuses only).
- Keyring (3.x) has no credential-listing API; account enumeration relies on a non-secret `accounts.json` index sidecar in the app data directory. If an account is removed by an external keyring client, the index may reference a missing entry (listAccounts tolerates this).
- Worktree status iterates the whole repo tree; on very large repositories this is slow. No caching or incremental status yet.
- The feature-module Repository IDE refactor is uncommitted (staged renames + unstaged modifications + untracked feature dirs on top of the initial application commit `b2cd37b`); committing it is the immediate next step.
- E2E tests cover browser-preview mode only; the Tauri desktop shell has no automated test coverage yet.

## Watch Items

- Avoid allowing the knowledge base to drift from implementation.
- Avoid provider-specific assumptions when the first integration is added.
- Avoid UI patterns that reduce transparency of repository operations.
- Do not float `gix` to a newer version casually: any upgrade must be planned against the vendored API surface and verified with `cargo check` + `cargo clippy`.
