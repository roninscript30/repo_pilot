# ADR-0007: Testing Pipeline And CI

Status: Accepted
Date: 2026-08-06

## Context

Repo Pilot must ship production-grade quality. The specification requires unit, integration, UI, and end-to-end tests, with CI running automatically.

## Decision

Testing layers:

- Unit tests: Vitest for domain logic, provider adapters, and pure functions.
- Integration tests: Vitest with mocked HTTP for provider adapters; Rust cargo tests for GitRuntime command behavior.
- UI tests: React Testing Library component tests.
- End-to-end tests: Playwright against the Vite dev server, with a mocked GitHub API layer so CI does not require real credentials.

CI: GitHub Actions running lint (ESLint), typecheck (tsc --noEmit), unit/integration tests, Playwright e2e, and a production build on every push to main and on pull requests.

## Rationale

- Vitest shares the Vite config, so tests run fast with the same module resolution as the app.
- Playwright with a mock GitHub API layer keeps e2e deterministic and credential-free in CI.
- Rust tests run in the same workflow, keeping backend and frontend gates in one pipeline.
- A production build step catches bundling issues that tests alone cannot.

## Alternatives Considered

- Jest: heavier config and slower startup; Vitest is the Vite-native choice.
- Cypress: heavier and slower; Playwright is faster, typed, and easier to CI.
- CI on tags only: rejected, pushes and PRs must be gated.

## Consequences

- Every PR must pass lint, typecheck, tests, and build before merge.
- The mock-GitHub e2e layer must be maintained alongside the real adapter.
- CI workflow requires the Tauri system dependencies to compile the Rust shell (Linux runners handle this).

## Follow-ups

- Add coverage reporting once the test suite is stable.
- Add a desktop smoke test job once a Tauri release build is feasible in CI.
