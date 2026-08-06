# Lessons Learned

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-06

## Current Lessons

- Establishing project memory before application code creates durable expectations for future contributors and AI agents.
- A simple knowledge structure is more maintainable than a large documentation tree at project start.
- AI contribution rules must be explicit and repository-local to be enforceable across sessions.
- Rust code written against a "newer than installed" gix API produces large compile-error cascades: always check the vendored source at the pinned version before using an API (gix 0.68.0 notably lacks stash helpers, `graph_ahead_behind`, and `set_head`, and `Editor::write()` takes no arguments).
- keyring 3.x has no credential-listing API; enumerate accounts with a non-secret sidecar index instead.
- Tauri command structs must use `serde(rename_all = "camelCase")` to match the TypeScript contract; Rust snake_case fields otherwise fail to deserialize/serialize.
- Tauri requires RGBA PNG icons and an alphanumeric bundle identifier; both silently block the context build with cryptic errors.
- Route-guard logic is security-adjacent: the "error" auth status must stay on the sign-in page, otherwise failed sign-ins navigate into the app shell with the error invisible (found by e2e test).
- Playwright route interception makes browser-preview flows testable without real credentials; e2e caught a routing bug unit tests could not.
- `Intl.NumberFormat` compact output differs by Node/ICU version (e.g. "1.2K" vs "1.2k"): assert the format the environment actually produces, or pin a formatter.
- Playwright `route.fulfill` responses go through browser CORS: custom response headers are hidden from page JS unless the mock sends `Access-Control-Allow-Origin` and `Access-Control-Expose-Headers`. The app reads `x-oauth-scopes` via `fetch` headers; without the mock headers the scope UI silently lost all scopes (caught by e2e).
- Icon-only navigation links need explicit accessible names (`aria-label`); Playwright role queries and accessibility snapshots expose nameless links.
- `locator.toBeVisible()` is not an API — always use `expect(locator).toBeVisible()`; chainable locator assertions silently throw "not a function" in specs.
- Grep/sed patterns in e2e mock URLs must match GitHub route globs exactly (`/user/orgs**` covers pagination query strings).
