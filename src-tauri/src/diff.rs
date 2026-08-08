//! Structured diff command surface for the Compare + Diff experience.
//!
//! `structured_diff` is the single source of truth for line-level changes:
//! it runs a Myers diff over the two blobs and produces context-grouped
//! hunks (`DiffHunk`/`DiffLine`) that the UI renders as unified, split, or
//! word-level views. `patch_from_hunks` renders those hunks back into a
//! git-format patch so the patch and the hunks always agree. `git_diff_files`
//! compares any two refs and returns per-file diffs; `git_tag_list` lists
//! local tags for the compare source/target pickers.

use gix::{
    bstr::ByteSlice,
    diff::blob::{self, intern::InternedInput, Algorithm},
    ObjectId,
};
use serde::{Deserialize, Serialize};
use std::ops::Range;

use crate::{
    blob_at_tree, get_worktree_status, git_err, is_binary, line_stats, open_repo,
    resolve_commit_id, tree_changes_between, worktree_root, FileDiff, RepoPilotResult,
};

/// Ref name that means "the on-disk working tree state" in `git_diff_files`.
pub(crate) const WORKTREE_REF: &str = "worktree";

/// One changed or context line within a diff hunk.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DiffLine {
    pub kind: String,
    pub old_no: Option<u32>,
    pub new_no: Option<u32>,
    pub text: String,
}

/// A contiguous change window with context lines and its start numbers.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<DiffLine>,
}

/// A local tag pointing at a commit (peeled).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TagInfo {
    pub name: String,
    pub id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GitDiffFilesArgs {
    pub path: String,
    pub base_ref: String,
    pub target_ref: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GitTagListArgs {
    pub path: String,
}

/// Context lines shown on each side of a change window.
const HUNK_CONTEXT: usize = 3;

/// Line-level structured diff between two text blobs. Empty for binary
/// content or identical inputs.
pub(crate) fn structured_diff(before: &[u8], after: &[u8]) -> Vec<DiffHunk> {
    if is_binary(before) || is_binary(after) {
        return Vec::new();
    }
    let input = InternedInput::new(before, after);
    let mut edits: Vec<(Range<u32>, Range<u32>)> = Vec::new();
    blob::diff(Algorithm::Myers, &input, |b: Range<u32>, a: Range<u32>| {
        edits.push((b, a));
    });
    if edits.is_empty() {
        return Vec::new();
    }
    group_hunks(tag_lines(&input, &edits))
}

/// Walk the edit script and emit a fully-tagged line stream (context,
/// remove, add) with 1-based line numbers.
fn tag_lines(input: &InternedInput<&[u8]>, edits: &[(Range<u32>, Range<u32>)]) -> Vec<DiffLine> {
    let before = &input.before;
    let after = &input.after;
    let interner = &input.interner;
    let mut lines: Vec<DiffLine> = Vec::new();
    let mut old_line = 1u32;
    let mut new_line = 1u32;
    let mut prev_b_end = 0usize;
    let mut prev_a_end = 0usize;

    for (b, a) in edits {
        // Context run between the previous change and this one. LCS-derived
        // edit scripts carry equal common-line counts on both sides.
        let ctx = b.start as usize - prev_b_end;
        for &token in &before[prev_b_end..prev_b_end + ctx] {
            lines.push(DiffLine {
                kind: "context".to_string(),
                old_no: Some(old_line),
                new_no: Some(new_line),
                text: String::from_utf8_lossy(interner[token]).to_string(),
            });
            old_line += 1;
            new_line += 1;
        }
        for &token in &before[b.start as usize..b.end as usize] {
            lines.push(DiffLine {
                kind: "remove".to_string(),
                old_no: Some(old_line),
                new_no: None,
                text: String::from_utf8_lossy(interner[token]).to_string(),
            });
            old_line += 1;
        }
        for &token in &after[a.start as usize..a.end as usize] {
            lines.push(DiffLine {
                kind: "add".to_string(),
                old_no: None,
                new_no: Some(new_line),
                text: String::from_utf8_lossy(interner[token]).to_string(),
            });
            new_line += 1;
        }
        prev_b_end = b.end as usize;
        prev_a_end = a.end as usize;
    }

    // Trailing context after the last change.
    let ctx = before.len().saturating_sub(prev_b_end);
    for &token in &before[prev_b_end..prev_b_end + ctx] {
        lines.push(DiffLine {
            kind: "context".to_string(),
            old_no: Some(old_line),
            new_no: Some(new_line),
            text: String::from_utf8_lossy(interner[token]).to_string(),
        });
        old_line += 1;
        new_line += 1;
    }

    let _ = prev_a_end; // paired with prev_b_end by the LCS invariant
    lines
}

/// Group a tagged line stream into hunks with at most `HUNK_CONTEXT` context
/// lines, merging change windows that are close enough to share one hunk.
fn group_hunks(lines: Vec<DiffLine>) -> Vec<DiffHunk> {
    let change_idx: Vec<usize> = lines
        .iter()
        .enumerate()
        .filter(|(_, line)| line.kind != "context")
        .map(|(index, _)| index)
        .collect();
    if change_idx.is_empty() {
        return Vec::new();
    }

    let mut hunks: Vec<DiffHunk> = Vec::new();
    let mut start = change_idx[0];
    let mut end = change_idx[0];
    for &index in &change_idx[1..] {
        if index - end <= 2 * HUNK_CONTEXT {
            end = index;
        } else {
            hunks.push(build_hunk(&lines, start, end));
            start = index;
            end = index;
        }
    }
    hunks.push(build_hunk(&lines, start, end));
    hunks
}

fn build_hunk(lines: &[DiffLine], change_start: usize, change_end: usize) -> DiffHunk {
    let start = change_start.saturating_sub(HUNK_CONTEXT);
    let end = (change_end + HUNK_CONTEXT + 1).min(lines.len());
    let slice = &lines[start..end];
    let old_start = slice.iter().find_map(|line| line.old_no).unwrap_or(1);
    let new_start = slice.iter().find_map(|line| line.new_no).unwrap_or(1);
    let old_lines = slice.iter().filter(|line| line.old_no.is_some()).count() as u32;
    let new_lines = slice.iter().filter(|line| line.new_no.is_some()).count() as u32;
    DiffHunk {
        old_start,
        old_lines,
        new_start,
        new_lines,
        lines: slice.to_vec(),
    }
}

/// Render structured hunks into a git-format unified patch string.
pub(crate) fn patch_from_hunks(hunks: &[DiffHunk]) -> String {
    let mut out = String::new();
    for hunk in hunks {
        out.push_str(&format!(
            "@@ -{},{} +{},{} @@\n",
            hunk.old_start, hunk.old_lines, hunk.new_start, hunk.new_lines
        ));
        for line in &hunk.lines {
            let prefix = match line.kind.as_str() {
                "add" => "+",
                "remove" => "-",
                _ => " ",
            };
            out.push_str(prefix);
            out.push_str(&line.text);
            out.push('\n');
        }
    }
    out
}

/// Per-file diff between any two resolvable refs (branches, tags, SHAs).
/// Either side may be the special name `worktree`, meaning the on-disk
/// working tree state (including untracked files).
#[tauri::command]
pub(crate) async fn git_diff_files(args: GitDiffFilesArgs) -> RepoPilotResult<Vec<FileDiff>> {
    let repo = open_repo(&args.path)?;
    let base_is_worktree = args.base_ref == WORKTREE_REF;
    let target_is_worktree = args.target_ref == WORKTREE_REF;
    if base_is_worktree && target_is_worktree {
        return Ok(Vec::new());
    }

    let base_id = (!base_is_worktree)
        .then(|| resolve_commit_id(&repo, &args.base_ref))
        .transpose()?;
    let target_id = (!target_is_worktree)
        .then(|| resolve_commit_id(&repo, &args.target_ref))
        .transpose()?;

    if base_is_worktree {
        return diff_worktree_against(&repo, target_id.unwrap(), true);
    }
    if target_is_worktree {
        return diff_worktree_against(&repo, base_id.unwrap(), false);
    }

    let base_id = base_id.unwrap();
    let target_id = target_id.unwrap();
    let changes = tree_changes_between(&repo, base_id, target_id)?;
    let base_tree = repo
        .find_commit(base_id)
        .map_err(git_err)?
        .tree()
        .map_err(git_err)?
        .id;
    let target_tree = repo
        .find_commit(target_id)
        .map_err(git_err)?
        .tree()
        .map_err(git_err)?
        .id;

    let mut out: Vec<FileDiff> = Vec::new();
    for change in changes {
        let before = blob_at_tree(&repo, base_tree, &change.path)?.unwrap_or_default();
        let after = blob_at_tree(&repo, target_tree, &change.path)?.unwrap_or_default();
        out.push(file_diff(&before, &after, change.path, change.status));
    }
    Ok(out)
}

/// Diff between one commit and the on-disk working tree. The path set is
/// the union of ref-vs-HEAD changes (for files the worktree left untouched)
/// and the worktree status changes; files equal on both sides are dropped.
fn diff_worktree_against(
    repo: &gix::Repository,
    other_id: ObjectId,
    worktree_is_base: bool,
) -> RepoPilotResult<Vec<FileDiff>> {
    let other_tree = repo
        .find_commit(other_id)
        .map_err(git_err)?
        .tree()
        .map_err(git_err)?
        .id;
    let root = worktree_root(repo);

    let mut paths: Vec<String> = Vec::new();
    if let Ok(head) = repo.head_commit() {
        for change in tree_changes_between(repo, other_id, head.id().into())? {
            paths.push(change.path);
        }
    }
    for file in get_worktree_status(repo)?.files {
        paths.push(file.path);
    }
    paths.sort();
    paths.dedup();

    let mut out: Vec<FileDiff> = Vec::new();
    for path in paths {
        let disk = std::fs::read(root.join(&path)).ok();
        let tree = blob_at_tree(repo, other_tree, &path)?;
        let (before, after) = if worktree_is_base {
            (disk, tree)
        } else {
            (tree, disk)
        };
        if before.is_none() && after.is_none() {
            continue;
        }
        let identical = before.as_ref() == after.as_ref();
        let status = match (before.is_some(), after.is_some()) {
            (true, true) if identical => continue,
            (true, true) => "modified",
            (true, false) => "removed",
            (false, true) => "added",
            (false, false) => continue,
        };
        out.push(file_diff(
            before.as_deref().unwrap_or_default(),
            after.as_deref().unwrap_or_default(),
            path,
            status.to_string(),
        ));
    }
    Ok(out)
}

/// Build a `FileDiff` from raw sides, honouring binary content by dropping
/// the structural hunks.
fn file_diff(before: &[u8], after: &[u8], path: String, status: String) -> FileDiff {
    let (additions, deletions) = line_stats(before, after);
    let binary = is_binary(before) || is_binary(after);
    let (patch, hunks) = if binary {
        (None, None)
    } else {
        let hunks = structured_diff(before, after);
        let patch = if hunks.is_empty() {
            Some(String::new())
        } else {
            Some(patch_from_hunks(&hunks))
        };
        (patch, Some(hunks))
    };
    FileDiff {
        path,
        status,
        additions,
        deletions,
        patch,
        binary,
        hunks,
    }
}

/// Local tag names and the commits they point at, sorted alphabetically.
#[tauri::command]
pub(crate) async fn git_tag_list(args: GitTagListArgs) -> RepoPilotResult<Vec<TagInfo>> {
    let repo = open_repo(&args.path)?;
    let mut tags: Vec<TagInfo> = Vec::new();
    for reference in repo.references().map_err(git_err)?.all().map_err(git_err)? {
        let reference = reference.map_err(git_err)?;
        let name = reference.name().as_bstr().to_str_lossy().to_string();
        if !name.starts_with("refs/tags/") {
            continue;
        }
        let tag_name = name.trim_start_matches("refs/tags/").to_string();
        let mut reference = reference;
        let Ok(peeled) = reference.peel_to_id_in_place() else {
            continue;
        };
        let target = peeled.detach();
        if repo.find_commit(target).is_err() {
            continue;
        }
        tags.push(TagInfo {
            name: tag_name,
            id: target.to_hex().to_string(),
        });
    }
    tags.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(tags)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn diff(a: &str, b: &str) -> Vec<DiffHunk> {
        structured_diff(a.as_bytes(), b.as_bytes())
    }

    #[test]
    fn identical_inputs_yield_no_hunks() {
        assert!(diff("hello\nworld\n", "hello\nworld\n").is_empty());
    }

    #[test]
    fn insertion_reports_adds_with_numbers() {
        let hunks = diff("a\nc\n", "a\nb\nc\n");
        assert_eq!(hunks.len(), 1);
        let lines = &hunks[0].lines;
        let adds: Vec<&str> = lines
            .iter()
            .filter(|line| line.kind == "add")
            .map(|line| line.text.as_str())
            .collect();
        assert_eq!(adds, vec!["b"]);
        // the added line has a new number but no old number
        let add = lines.iter().find(|line| line.kind == "add").expect("add");
        assert_eq!(add.new_no, Some(2));
        assert_eq!(add.old_no, None);
        // context survives around the change
        assert!(lines
            .iter()
            .any(|line| line.kind == "context" && line.text == "a"));
    }

    #[test]
    fn deletion_reports_removes_with_old_numbers() {
        let hunks = diff("a\nb\nc\n", "a\nc\n");
        let remove = hunks[0]
            .lines
            .iter()
            .find(|line| line.kind == "remove")
            .expect("remove");
        assert_eq!(remove.text, "b");
        assert_eq!(remove.old_no, Some(2));
        assert_eq!(remove.new_no, None);
    }

    #[test]
    fn distant_changes_split_into_separate_hunks() {
        let mut before = String::new();
        let mut after = String::new();
        for index in 0..30 {
            before.push_str(&format!("line{index}\n"));
            after.push_str(&format!("line{index}\n"));
        }
        after.replace_range(0..5, "changed\nchanged\nchanged\nchanged\nchanged\n");
        after.push_str("tail\n");
        let hunks = diff(&before, &after);
        assert!(
            hunks.len() >= 2,
            "expected separate hunks, got {}",
            hunks.len()
        );
        for hunk in &hunks {
            assert!(!hunk.lines.is_empty());
        }
    }

    #[test]
    fn binary_content_yields_no_hunks() {
        assert!(structured_diff(b"a\x00b", b"a\x00c").is_empty());
    }

    #[test]
    fn patch_round_trips_through_hunks() {
        let hunks = diff("one\ntwo\nthree\n", "one\ntwo and a half\nthree\nfour\n");
        let patch = patch_from_hunks(&hunks);
        assert!(patch.contains("@@ -"));
        assert!(patch.contains("+two and a half"));
        assert!(patch.contains("+four"));
        assert!(patch.contains("-two"));
    }
}
