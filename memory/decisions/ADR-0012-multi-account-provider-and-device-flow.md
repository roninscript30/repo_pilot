# ADR-0012: Multi-Account Provider Model and OAuth Device Flow

Status: Accepted
Date: 2026-08-07

## Context

Phase 1.5 requires GitHub accounts to be linked via OAuth Device Flow (desktop-friendly) with PAT as fallback, and multiple accounts to connect and switch in-session. The existing auth store held a single `account`; the provider registry returned one GitHub provider bound to `accounts[0]`, and TanStack Query keys were not account-scoped. Device Flow needs a registered GitHub OAuth App `client_id` and a reliable way to open the verification URI in the system browser.

## Decision

1. **Multi-account provider model — active-account binding + cache clear.**
   - `useAuthStore` now holds `accounts: Account[]` plus the active `account` (kept as a backward-compatible getter), an `epoch` counter, and actions `switchAccount(login)` / `removeAccount(login)`.
   - `ProviderRegistry` keeps one provider instance per account keyed `github:<login>` plus a fallback instance; `setActiveAccount(login)` selects which instance `githubProvider()` returns. `resolveProvider(store, accountLogin?)` binds a provider's token read to exactly one login.
   - Account changes clear the React Query cache (`queryClient.clear()` via a shared `services/query-client.ts` singleton), forcing all provider queries to refetch under the new account. This is simpler and no less correct than rewriting every query key to a per-account scope: mounted observers re-render on cache invalidation, and unmounted queries refetch on next mount.
   - `loadStoredSessions` validates every stored token at startup, restores all valid accounts, and activates the last-active account (persisted preference `auth.activeAccount`), honoring revoked/expired tokens by omitting them.
2. **OAuth Device Flow with configurable client_id.**
   - New `providers/github/device-flow.ts` `GitHubDeviceFlowClient` implements the flow against `github.com/login/device/code` and `/login/oauth/access_token`. `client_id` is read from `VITE_GITHUB_CLIENT_ID`, falling back to a documented placeholder (`DEFAULT_GITHUB_CLIENT_ID`) so the flow is demoable before a real OAuth App is registered. PAT remains the always-available fallback.
3. **System-browser opener as a native command.**
   - New `open_external(url)` Tauri command spawns the platform opener (`xdg-open` / `open` / `cmd start`) via `std::process::Command`; refuses non-HTTP URLs. No new crates or plugin, so the opener does not depend on registry/network availability. The frontend `services/open-external.ts` prefers the command and falls back to `window.open`.
   - Device flow UI (`GithubDeviceFlowView`, `AddAccountDialog`, updated `SignInPage`, `SettingsPage` accounts card, `AccountMenu` switcher) surfaced across the app.

## Rationale

- Active-account binding keeps every existing `githubProvider()` call site working unchanged; the cache clear guarantees correctness without touching ~50 query keys across the app.
- Device flow runs entirely in the frontend (CSP already allows `github.com`); token persistence stays in the keyring-backed `CredentialStore` (ADR-0005).
- A tiny native command is more reliable than `window.open` in a Tauri WebView and avoids adding the opener plugin (crate + capability) whose install is environment-dependent.

## Alternatives Considered

- **Per-hook scoped query keys** (`["scope", login, epoch]` prefix on every provider hook): precise but a large, error-prone cross-file refactor; rejected in favor of cache-clear for this slice. May revisit if account state needs fine-grained per-account caching (e.g. offline caches).
- **tauri-plugin-opener** for `openUrl`: rejected because it adds a Rust crate + npm package + capability whose fetch may fail offline; the std-only command has the same user-visible result.
- **gitoxide network for OAuth exchanges**: N/A (HTTP lives in the webview); noted for later Git network work in ADR for system git.

## Consequences

- Adding/removing/switching accounts invalidates all remote data (browser-preview and desktop), which is the desired behavior but slightly heavier than necessary for local-only views.
- The provider registry's active-account state is a module singleton; tests must reset it (`providerRegistry.setActiveAccount(null)` + `localStorage.clear()`) in `beforeEach`.
- Startup now makes one validation call per stored account; a large number of stale accounts would each incur a request until removed.

## Follow-ups

- Repository tabs and workspace state should become per-account (Slice 7) so switching accounts does not surface another account's open documents.
- Device Flow currently uses the placeholder client_id by default; document registering a GitHub OAuth App and setting `VITE_GITHUB_CLIENT_ID`.
