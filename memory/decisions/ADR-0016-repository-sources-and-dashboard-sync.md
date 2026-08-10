# ADR-0016: Repository Sources, Dashboard Sync, and Per-Account Tab Overflow

Status: Accepted
Date: 2026-08-10

## Context

Slice 7 adds three connected surfaces: repository sources to browse
(starred / org / recent / pinned), dashboard activity aggregation with a
"Sync all" refresh, and IDE-style tab management that survives many open
tabs (overflow sections) across per-account workspaces. The plan
originally specified a GraphQL `user.pinnedItems` query for the pinned
source; the app already had a localStorage pin concept, and no GraphQL
client exists in the GitHub adapter.

## Decision

1. **Repo sources are REST, not GraphQL.** `Provider` gains
   `listStarredRepositories`, `listOrganizationRepositories(org)`, and
   `listRecentRepositories` backed by `/user/starred`, `/orgs/{org}/repos`,
   and `/user/repos?sort=updated&affiliation=owner,collaborator,organization_member`.
   The **pinned source reuses the existing localStorage pins**
   (`getPinnedRepositoryNames`, ADR-0005 boundary — pin names are
   non-secret preference data) and resolves each name via
   `getRepository(fullName)`. A pinned repo that no longer exists is
   dropped silently rather than surfacing a page error. GraphQL
   `user.pinnedItems` is noted as a future enhancement if GitHub-profile
   pins (distinct from the app's pin concept) are ever wanted.
2. **Query keys stay account-simple.** The auth store clears the entire
   React Query cache on account switch (`queryClient.clear()`), so hooks
   keep unscoped keys (`["repositories"]`, `["repository", "overview",
   fullName]`, `["dashboard", fullName, ...]`). Cross-account staleness is
   impossible because the cache is reset at the boundary.
3. **Dashboard "Sync all" invalidates and refetches prefixes.**
   `refetchQueries({ queryKey: ["dashboard"] })` +
   `refetchQueries({ queryKey: ["repositories"] })`, gated behind a
   spinner button; releases + contributors are added to the existing
   `useCollaborationDashboard` fan-out (`listReleases` ×3,
   `listContributors` ×5 per scoped repo) for the Recent releases and Top
   contributors cards.
4. **Per-account tabs extend to recently-closed overflow.** Workspace tabs
   are already scoped per account (`workspace.tabs.{login}`). The tab bar
   gains a `TabOverflowMenu` with three sections: open tabs, recently
   closed (per-account, `workspace.recently-closed.{login}`, capped at 10,
   deduped by full name, `Clear` action), and pinned repositories not
   already open (from localStorage). Selecting a pinned repo navigates via
   `repoWorkspacePathForFullName`.
5. **"Open local" is a real desktop command.** New Rust `open_folder(path)`
   validates the path is a directory then hands it to the platform opener
   (`xdg-open`/`open`/`explorer`); `services/open-folder.ts` wraps it and
   returns false in browser preview. The workspace header shows "Open
   local" when a working tree is linked.

## Consequences

- The pinned source reflects app pins, not GitHub profile pins; the two
  concepts are documented as distinct.
- Adding releases/contributors fan-out raises the dashboard's query count
  by up to 6 (bounded by `MAX_SCOPED_REPOS = 3`), mitigated by
  `staleTime` (60s / 5m).
- Tab overflow gives every open and recently-closed repository a
  reachable target once the strip scrolls, per account.
- No new provider/credential surface or GraphQL dependency.
