# ADR-0005: Authentication And Secret Storage

Status: Accepted
Date: 2026-08-06

## Context

Repo Pilot requires provider-based authentication with multiple accounts, session persistence, permission validation, and token expiration handling. Credentials must never be stored in plaintext.

The project must also remain fully runnable in a browser-preview (Vite dev server) mode, which has no access to OS keychains.

## Decision

Authentication is provider-based. The first provider integration is GitHub with two flows:

1. **Fine-grained PAT** — the Phase 1 fallback flow. The user pastes a token; Repo Pilot validates it and its scopes against the GitHub API before storing an account session.
2. **OAuth device flow** — the Phase 1 primary flow, added after the PAT slice lands.

Secrets go through a `CredentialStore` port:

- Desktop (Tauri): OS keyring via the `keyring` crate — macOS Keychain, Windows Credential Manager, Linux Secret Service.
- Browser preview: in-memory only, never persisted to localStorage or any other durable storage. The UI shows an explicit "in-memory session" warning banner.

Tokens are never logged, never placed in query strings, and only sent to the provider's own API endpoints.

## Rationale

- Fine-grained PATs are zero-config and work immediately with REST, matching the specification's Phase 1 fallback.
- The OS keyring satisfies the "secure OS credential storage" requirement per platform.
- The in-memory browser fallback keeps the browser-preview mode safe and honest: credentials disappear when the tab closes.
- The `CredentialStore` port keeps native details behind an interface so the frontend stays environment-agnostic.

## Alternatives Considered

- Plaintext localStorage: rejected — never store tokens in plaintext.
- OAuth only: rejected because PAT is the specified fallback and unblocks early development.
- Electron safeStorage: rejected alongside Electron in ADR-0003.

## Consequences

- All provider calls require a validated account session held by the auth store.
- Token expiration (401) triggers re-authentication without losing local UI state.
- The credential store seam must be implemented twice (Tauri keyring, in-memory web).
- Security reviews must confirm no secret ever reaches logs or persisted web storage.

## Follow-ups

- Implement the PAT vertical slice first.
- Add OAuth device flow behind the same auth session model.
- Add multi-account account-switcher UI in the repository browser slice.
