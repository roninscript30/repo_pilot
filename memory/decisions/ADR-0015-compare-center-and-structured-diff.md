# ADR-0015: Compare Center and Structured Diff Surface

Status: Accepted
Date: 2026-08-08

## Context

Slice 4 needs a Compare center (any two refs compared with divergence,
file navigation and merge/rebase preview) and a rich diff experience. The
existing `git_file_diff` returned an ad-hoc unified patch for HEAD/index
vs index/worktree only. Rendering unified, split, and word-level views
from raw patch text is fragile, and comparing arbitrary pairs of
branches/tags/commits/working tree requires a per-ref resolution story.

## Decision

1. **Structured hunks are the single source of truth.** A Rust Myers diff
   (`src-tauri/src/diff.rs::structured_diff`, gix blob diff over
   `InternedInput`) emits `DiffHunk`/`DiffLine` with 1-based line numbers.
   Unified patch text is *derived* from the hunks via `patch_from_hunks`
   so the patch and the UI can never disagree. Binary content yields no
   hunks and no patch.
2. **`git_diff_files(path, baseRef, targetRef)`** compares any two
   resolvable refs (branches, tags, raw revs/SHAs, `HEAD~n`) and returns
   per-file `FileDiff { path, status, additions, deletions, patch, binary,
   hunks }`. `resolve_commit_id` now tries `HEAD`, `refs/heads/`,
   `refs/remotes/`, `refs/tags/`, and the raw string in order.
3. **`worktree` is a valid diff side.** Either ref may be the literal
   `worktree`, meaning the on-disk state including untracked files. The
   path set is the union of ref-vs-HEAD tree changes and the live worktree
   status; sides are read from disk or the ref tree and equal files are
   dropped. This powers the common "Working tree ↔ HEAD" comparison
   without a separate command.
4. **Rebase preview shares merge preview.** Replaying `target` onto
   `base` touches the same paths changed between the merge base and
   `target`, and conflicts are the same overlapping paths, so the UI
   presents one simulated preview with Merge/Rebase framing instead of
   duplicating algorithms. Line-level conflict detection is deferred.
5. **DiffViewer renders all modes from the same hunks:** unified,
   split, and word views (word mode diffs token runs by char-level LCS in
   `lib/word-diff.ts`), plus syntax highlighting (highlight.js,
   `SyntaxHighlight`), markdown preview, hunk collapse and change
   navigation.

## Rationale

One diff engine used by list views, previews, and the viewer keeps
line counts and content consistent everywhere; deriving the patch from
hunks removes parser drift. Resolving refs in Rust frees the UI from git
rev parsing and lets one picker accept branch, tag, and rev strings.

## Alternatives Considered

- Parsing `git diff` text output with a unified-diff parser: fragile for
  split/word rendering and error-prone on unicode/CRLF; rejected.
- A dedicated worktree-diff command: narrower than the special `worktree`
  side, which also composes with tag/branch picks.
- A separate rebase preview command: duplicates merge-base analysis with
  identical output today; revisit when line-level layout previews land.

## Consequences

- `FileDiff` is `pub(crate)` with a `hunks` field; `git_file_diff`
  (worktree view) now also emits hunks via the same engine, unifying the
  two surfaces.
- UI must treat `patch` as derived: viewer code consumes `hunks` when
  present and falls back to parse only for backwards compat.
- The `worktree` ref fails closed (empty result) if both sides are
  worktree.

## Follow-ups

- Line-level merge/rebase conflict detection (three-way content merge).
- Diff caching / incremental stats for very large refs.
- `resolve_commit_id` single-format strictness if ambiguous SHAs surface.
