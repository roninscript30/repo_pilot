# ADR-0008: First-Run Onboarding Gate

Status: Accepted
Date: 2026-08-06

## Context

The app previously booted directly into a standalone sign-in page. The product
is a desktop-first, keyboard-first platform where connecting to a provider is
an onboarding moment, not a login form: pick a provider, validate a
fine-grained PAT, confirm required scopes, review organizations, and sync the
initial repository index. Returning users should go straight to a classic
sign-in; first-run users need the full walkthrough. Persistence is handled by a
generic user-preferences service (localStorage under `gitos:preferences` in
browser preview, OS keyring on desktop).

## Decision

- Add a single `Onboarding` component with eight steps: welcome -> intro ->
  provider -> auth -> permissions -> account -> sync -> ready.
- Gate it at the app root (`App.tsx`) before any auth check: when
  `onboarding-completed` is not set, render onboarding regardless of auth state.
- Persist the completion flag as `onboarding-completed` via user-preferences;
  the store (`useOnboardingStore`) reads it synchronously at module init.
- Keep the classic `SignInPage` for returning users (shown by `RequireAuth`
  when onboarding is complete but no session exists).
- Onboarding performs real provider calls during the walkthrough: account
  validation, organization list, and repository sync (the sync step advances
  automatically once repositories arrive).

## Rationale

Gating onboarding before auth makes the first run "connect to the platform"
instead of "log in", matching the product vision. The synchronous,
preference-backed flag avoids an async restore flash. Reusing the standard
auth store keeps one code path for token validation across onboarding and
sign-in.

## Alternatives Considered

- Keep the sign-in page as the only entry point: lost the product narrative and
  forced a sign-in before explaining the workspace.
- Modal onboarding after first sign-in: split the flow into two auth surfaces
  and complicated state.

## Consequences

- First run requires network access to GitHub (account, orgs, repos calls).
- E2E tests must either walk the full flow or seed the preference
  (`gitos:preferences` -> `onboarding-completed: true`).
- `SignInPage` and the auth steps of onboarding both render store errors, so
  stale-token handling stays consistent.

## Follow-ups

- Add GitLab/Gitea providers to the provider step (they are currently listed as
  "Soon", disabled).
- Consider a "skip for now" path if the sync step ever becomes optional.
