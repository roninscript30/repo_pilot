# Skill: Tauri And Rust Integration

Status: Draft
Owner: Project Maintainers
Last Updated: 2026-08-06
Related: `../architecture.md`, `../rules.md`

## Purpose

Capture expected practices if the project adopts Tauri and Rust for desktop integration.

## Principles

- Use Rust for secure local system integration, file access, Git operations, background tasks, and performance-sensitive work.
- Keep the command boundary small and well typed.
- Validate input at the Rust boundary.
- Do not expose broad filesystem or shell capabilities without clear need and safety constraints.
- Keep secrets out of logs and frontend state.

## Integration Guidance

- Treat frontend-to-backend commands as public contracts.
- Document commands that affect repositories or credentials.
- Keep provider API calls and local Git operations behind application services.
- Prefer explicit error types that the UI can present clearly.

## Open Questions

- Final desktop framework choice
- Local database choice
- Secret storage strategy
- Background task model

## Reference Sources

- Tauri documentation: https://tauri.app/
- Rust book: https://doc.rust-lang.org/book/
- Rust API guidelines: https://rust-lang.github.io/api-guidelines/
