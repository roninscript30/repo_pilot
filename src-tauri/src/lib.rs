use gix::{
    bstr::{BStr, ByteSlice},
    diff::blob::{self, intern::InternedInput, sink::Counter, Algorithm},
    open,
    refs::{
        transaction::{Change, PreviousValue, RefLog},
        FullName,
    },
    ObjectId, Repository,
};
use keyring::{Entry, Error as KeyringError};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs,
    ops::Range,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{Emitter, Manager};
use tempfile::TempDir;
use thiserror::Error;

mod git_graph;
mod git_system;

#[derive(Error, Debug)]
pub enum RepoPilotError {
    #[error("Keyring error: {0}")]
    Keyring(#[from] KeyringError),
    #[error("Git error: {0}")]
    Git(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Repository not found: {0}")]
    RepoNotFound(String),
    #[error("Invalid reference: {0}")]
    InvalidRef(String),
    #[error("Operation unsupported: {0}")]
    Unsupported(String),
    #[error("Could not resolve the app data directory")]
    NoAppDataDir,
}

impl serde::Serialize for RepoPilotError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

type RepoPilotResult<T> = std::result::Result<T, RepoPilotError>;

/// Map any displayable error into a user-facing RepoPilotError::Git message.
fn git_err<E: std::fmt::Display>(error: E) -> RepoPilotError {
    RepoPilotError::Git(error.to_string())
}

const SERVICE_NAME: &str = "com.repopilot.app";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CredentialSetArgs {
    provider_id: String,
    account_login: String,
    token: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CredentialGetArgs {
    provider_id: String,
    account_login: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CredentialDeleteArgs {
    provider_id: String,
    account_login: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CredentialListArgs {
    provider_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitOpenRepoArgs {
    path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitWorktreeStatusArgs {
    path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitListBranchesArgs {
    path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitListCommitsArgs {
    path: String,
    branch: Option<String>,
    limit: Option<usize>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitGetCommitArgs {
    path: String,
    sha: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitRunOperationArgs {
    operation: String,
    repo_path: String,
    payload: serde_json::Value,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitRunInSandboxArgs {
    operation: String,
    sandbox_seed: String,
    payload: serde_json::Value,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitFileDiffArgs {
    path: String,
    spec: FileDiffSpec,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FileDiffSpec {
    path: String,
    base: String,
    target: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitCompareRefsArgs {
    path: String,
    base_ref: String,
    target_ref: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitMergePreviewArgs {
    path: String,
    head_ref: String,
    target_ref: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitSyncLogArgs {
    path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorktreeStatus {
    repo_path: String,
    current_branch: Option<String>,
    head_sha: Option<String>,
    tracking_branch: Option<String>,
    ahead_by: u32,
    behind_by: u32,
    /// Per-file detail; the grouped path lists below are derived views.
    files: Vec<WorktreeFile>,
    staged: Vec<String>,
    unstaged: Vec<String>,
    untracked: Vec<String>,
    ignored: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorktreeFile {
    path: String,
    state: String,
    staged_additions: u32,
    staged_deletions: u32,
    unstaged_additions: u32,
    unstaged_deletions: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileDiff {
    path: String,
    status: String,
    additions: u32,
    deletions: u32,
    patch: Option<String>,
    binary: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RefComparisonFile {
    path: String,
    status: String,
    additions: u32,
    deletions: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RefComparison {
    base_ref: String,
    target_ref: String,
    merge_base: Option<String>,
    ahead_by: u32,
    behind_by: u32,
    commits: Vec<CommitSummary>,
    files: Vec<RefComparisonFile>,
    conflict_paths: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MergePreview {
    head_ref: String,
    target_ref: String,
    merge_base: Option<String>,
    fast_forward: bool,
    commits_ahead: u32,
    files_changed: Vec<RefComparisonFile>,
    conflict_paths: Vec<String>,
    can_merge: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncLog {
    fetch_at: Option<String>,
    pull_at: Option<String>,
    push_at: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Branch {
    name: String,
    is_protected: bool,
    latest_commit: Option<CommitSummary>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CommitAuthor {
    name: String,
    email: String,
    login: Option<String>,
    avatar_url: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CommitSummary {
    sha: String,
    short_sha: String,
    message: String,
    subject: String,
    author: CommitAuthor,
    committed_at: String,
    /// Parent shas; powers the commit graph lane algorithm.
    parents: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CommitFileChange {
    filename: String,
    status: String,
    additions: u32,
    deletions: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CommitDetail {
    sha: String,
    short_sha: String,
    message: String,
    subject: String,
    author: CommitAuthor,
    committed_at: String,
    parents: Vec<String>,
    changes: Vec<CommitFileChange>,
    additions: u32,
    deletions: u32,
    patch: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GitOperationResult {
    ok: bool,
    message: String,
    unsupported: Option<bool>,
}

fn credential_key(provider_id: &str, account_login: &str) -> String {
    format!("{}:{}", provider_id, account_login)
}

// ---------------------------------------------------------------------------
// Credential commands (OS keyring).
//
// The keyring crate has no API to enumerate entries, so a small JSON index
// file in the app data directory tracks which "provider:login" keys exist.
// The actual secrets live only in the OS keyring (ADR-0005); the index is a
// non-secret directory of account names.
// ---------------------------------------------------------------------------

fn account_index_path(app: &tauri::AppHandle) -> RepoPilotResult<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| RepoPilotError::NoAppDataDir)?;
    Ok(dir.join("accounts.json"))
}

fn read_account_index(app: &tauri::AppHandle) -> RepoPilotResult<Vec<String>> {
    let path = account_index_path(app)?;
    match fs::read_to_string(&path) {
        Ok(raw) => serde_json::from_str(&raw).map_err(|e| RepoPilotError::Git(e.to_string())),
        Err(_) => Ok(Vec::new()),
    }
}

fn write_account_index(app: &tauri::AppHandle, keys: &[String]) -> RepoPilotResult<()> {
    let path = account_index_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let raw = serde_json::to_string_pretty(keys).map_err(|e| RepoPilotError::Git(e.to_string()))?;
    fs::write(&path, raw)?;
    Ok(())
}

#[tauri::command]
async fn credential_set(app: tauri::AppHandle, args: CredentialSetArgs) -> RepoPilotResult<bool> {
    let key = credential_key(&args.provider_id, &args.account_login);
    let entry = Entry::new(SERVICE_NAME, &key)?;
    entry.set_password(&args.token)?;

    let mut keys = read_account_index(&app)?;
    if !keys.contains(&key) {
        keys.push(key);
        write_account_index(&app, &keys)?;
    }
    Ok(true)
}

#[tauri::command]
async fn credential_get(args: CredentialGetArgs) -> RepoPilotResult<Option<String>> {
    let key = credential_key(&args.provider_id, &args.account_login);
    let entry = Entry::new(SERVICE_NAME, &key)?;
    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

#[tauri::command]
async fn credential_delete(
    app: tauri::AppHandle,
    args: CredentialDeleteArgs,
) -> RepoPilotResult<()> {
    let key = credential_key(&args.provider_id, &args.account_login);
    let entry = Entry::new(SERVICE_NAME, &key)?;
    match entry.delete_credential() {
        Ok(_) => {}
        Err(KeyringError::NoEntry) => {}
        Err(e) => return Err(e.into()),
    }

    let mut keys = read_account_index(&app)?;
    keys.retain(|k| k != &key);
    write_account_index(&app, &keys)?;
    Ok(())
}

#[tauri::command]
async fn credential_list_accounts(
    app: tauri::AppHandle,
    args: CredentialListArgs,
) -> RepoPilotResult<Vec<String>> {
    let keys = read_account_index(&app)?;
    let prefix = format!("{}:", args.provider_id);
    let mut accounts = Vec::new();
    for key in keys.iter().filter(|key| key.starts_with(&prefix)) {
        let login = key[prefix.len()..].to_string();
        if Entry::new(SERVICE_NAME, key)
            .and_then(|entry| entry.get_password())
            .is_ok()
        {
            accounts.push(login);
        }
    }
    Ok(accounts)
}

/// The first stored GitHub account login, if any (used when a git operation
/// does not name an account explicitly).
pub(crate) fn first_github_account(app: &tauri::AppHandle) -> RepoPilotResult<Option<String>> {
    let keys = read_account_index(app)?;
    let prefix = "github:";
    Ok(keys
        .iter()
        .find(|key| key.starts_with(prefix))
        .map(|key| key[prefix.len()..].to_string()))
}

// ---------------------------------------------------------------------------
// Local Git commands (gitoxide).
// ---------------------------------------------------------------------------

fn open_repo(path: &str) -> RepoPilotResult<Repository> {
    open(path).map_err(git_err)
}

fn worktree_root(repo: &Repository) -> PathBuf {
    repo.worktree()
        .map(|worktree| worktree.base().to_path_buf())
        .unwrap_or_else(|| repo.path().to_path_buf())
}

/// Build the tree object id representing the current index contents.
fn tree_id_from_index(repo: &Repository) -> RepoPilotResult<ObjectId> {
    let index = repo
        .index_or_load_from_head()
        .map_err(git_err)?
        .into_owned();
    let mut editor = gix::object::tree::Editor::new(&repo.empty_tree()).map_err(git_err)?;
    let backing = index.path_backing();
    for entry in index.entries() {
        if entry.mode.contains(gix::index::entry::Mode::DIR) {
            continue;
        }
        let path = entry.path_in(backing);
        let kind = entry
            .mode
            .to_tree_entry_mode()
            .map(gix::objs::tree::EntryKind::from)
            .unwrap_or(gix::objs::tree::EntryKind::Blob);
        editor.upsert(path, kind, entry.id).map_err(git_err)?;
    }
    editor.write().map_err(git_err).map(|id| id.detach())
}

/// Count commits reachable from `tip` but not from `exclude` (one direction
/// of the ahead/behind computation).
fn count_reachable(repo: &Repository, tip: ObjectId, exclude: ObjectId) -> RepoPilotResult<u32> {
    let mut count = 0u32;
    for info in repo
        .rev_walk([tip])
        .with_pruned([exclude])
        .all()
        .map_err(git_err)?
    {
        info.map_err(git_err)?;
        count += 1;
    }
    Ok(count)
}

/// True for content that cannot be line-diffed safely.
fn is_binary(bytes: &[u8]) -> bool {
    bytes.contains(&0)
}

/// Count added/removed lines between two text blobs using a Myers line diff.
fn line_stats(before: &[u8], after: &[u8]) -> (u32, u32) {
    if is_binary(before) || is_binary(after) {
        return (0, 0);
    }
    let input = InternedInput::new(before, after);
    let counts = blob::diff(Algorithm::Myers, &input, Counter::default());
    (counts.insertions, counts.removals)
}

/// Line counts of a text blob (used for untracked files: everything is an addition).
fn line_count(bytes: &[u8]) -> u32 {
    if is_binary(bytes) {
        return 0;
    }
    bytes
        .split(|byte| *byte == b'\n')
        .filter(|line| !line.is_empty())
        .count() as u32
}

fn read_blob_bytes(repo: &Repository, id: ObjectId) -> RepoPilotResult<Vec<u8>> {
    Ok(repo.find_blob(id).map_err(git_err)?.data.to_vec())
}

/// Recursively locate a blob in a tree by repository-relative path.
fn blob_at_tree(
    repo: &Repository,
    tree_id: ObjectId,
    path: &str,
) -> RepoPilotResult<Option<Vec<u8>>> {
    let mut parts = path.split('/').peekable();
    let mut tree = repo.find_tree(tree_id).map_err(git_err)?;
    while let Some(part) = parts.next() {
        let mut found: Option<(gix::objs::tree::EntryKind, ObjectId)> = None;
        for entry in tree.iter() {
            let entry = entry.map_err(git_err)?;
            let name = entry.filename().to_str_lossy();
            if name == part {
                found = Some((entry.mode().kind(), entry.oid().to_owned()));
                break;
            }
        }
        let Some((kind, oid)) = found else {
            return Ok(None);
        };
        if parts.peek().is_none() {
            return if matches!(kind, gix::objs::tree::EntryKind::Blob) {
                read_blob_bytes(repo, oid).map(Some)
            } else {
                Ok(None)
            };
        }
        tree = repo.find_tree(oid).map_err(git_err)?;
    }
    Ok(None)
}

/// Render a unified diff patch (git format) between two text blobs.
fn render_unified_patch(before: &[u8], after: &[u8]) -> Option<String> {
    if is_binary(before) || is_binary(after) {
        return None;
    }
    let input = InternedInput::new(before, after);
    let mut hunks: Vec<(Range<u32>, Range<u32>)> = Vec::new();
    blob::diff(Algorithm::Myers, &input, |b: Range<u32>, a: Range<u32>| {
        hunks.push((b, a));
    });
    if hunks.is_empty() {
        return Some(String::new());
    }
    let mut out = String::new();
    let mut old_line = 1u32;
    let mut new_line = 1u32;
    for (before_range, after_range) in hunks {
        let old_count = before_range.end - before_range.start;
        let new_count = after_range.end - after_range.start;
        let old_start = if old_count == 0 {
            old_line.saturating_sub(1)
        } else {
            old_line
        };
        let new_start = if new_count == 0 {
            new_line.saturating_sub(1)
        } else {
            new_line
        };
        out.push_str(&format!(
            "@@ -{},{} +{},{} @@\n",
            old_start, old_count, new_start, new_count
        ));
        for token in &input.before[before_range.start as usize..before_range.end as usize] {
            out.push('-');
            out.push_str(&String::from_utf8_lossy(input.interner[*token]));
            out.push('\n');
        }
        for token in &input.after[after_range.start as usize..after_range.end as usize] {
            out.push('+');
            out.push_str(&String::from_utf8_lossy(input.interner[*token]));
            out.push('\n');
        }
        old_line += old_count;
        new_line += new_count;
    }
    Some(out)
}

/// The remote-tracking branch for a local branch, e.g. "origin/main".
fn find_tracking_branch(repo: &Repository, branch: &str) -> RepoPilotResult<Option<String>> {
    let suffix = format!("/{}", branch);
    let mut candidate: Option<String> = None;
    for reference in repo.references().map_err(git_err)?.all().map_err(git_err)? {
        let reference = reference.map_err(git_err)?;
        let name = reference.name().as_bstr().to_str_lossy().to_string();
        if name.starts_with("refs/remotes/") && name.ends_with(&suffix) {
            let prefer_origin = candidate
                .as_deref()
                .is_none_or(|current| current.starts_with("refs/remotes/origin/"));
            let is_origin = name.starts_with("refs/remotes/origin/");
            if prefer_origin || is_origin {
                candidate = Some(name.trim_start_matches("refs/remotes/").to_string());
                if is_origin {
                    break;
                }
            }
        }
    }
    Ok(candidate)
}

/// Per-file staged stats between HEAD's tree and the index tree.
fn staged_files_with_stats(repo: &Repository) -> RepoPilotResult<Vec<WorktreeFile>> {
    let head_commit = match repo.head_commit() {
        Ok(commit) => commit,
        Err(_) => return Ok(Vec::new()),
    };
    let head_tree = head_commit.tree().map_err(git_err)?;
    let index_tree_id = tree_id_from_index(repo)?;
    let index_tree = repo.find_tree(index_tree_id).map_err(git_err)?;

    let mut platform = head_tree.changes().map_err(git_err)?;
    let mut out: Vec<WorktreeFile> = Vec::new();
    platform
        .for_each_to_obtain_tree(&index_tree, |change| {
            use gix::object::tree::diff::Action;
            let mut cache = repo
                .diff_resource_cache_for_tree_diff()
                .map_err(|e| RepoPilotError::Git(e.to_string()))?;
            let (insertions, removals) = change
                .diff(&mut cache)
                .ok()
                .and_then(|mut platform| platform.line_counts().ok())
                .flatten()
                .map(|counts| (counts.insertions, counts.removals))
                .unwrap_or_default();
            out.push(WorktreeFile {
                path: String::from_utf8_lossy(change.location().as_ref()).to_string(),
                state: "staged".into(),
                staged_additions: insertions,
                staged_deletions: removals,
                unstaged_additions: 0,
                unstaged_deletions: 0,
            });
            Ok::<_, RepoPilotError>(Action::Continue)
        })
        .map_err(git_err)?;
    Ok(out)
}

fn get_worktree_status(repo: &Repository) -> RepoPilotResult<WorktreeStatus> {
    let head_name = repo.head_name().ok().flatten().map(|name| name.to_string());
    let head_sha = repo
        .head_commit()
        .ok()
        .map(|commit| commit.id().to_hex().to_string());

    let staged = staged_files_with_stats(repo)?;

    let mut unstaged: Vec<WorktreeFile> = Vec::new();
    let mut untracked: Vec<WorktreeFile> = Vec::new();
    let mut ignored: Vec<WorktreeFile> = Vec::new();
    let root = worktree_root(repo);
    let status = repo
        .status(gix::progress::Discard)
        .map_err(git_err)?
        .index_worktree_options_mut(|options| {
            if let Some(dirwalk) = options.dirwalk_options.as_mut() {
                dirwalk.set_emit_ignored(Some(gix::dir::walk::EmissionMode::Matching));
            }
        })
        .index_worktree_rewrites(None)
        .into_index_worktree_iter(Vec::<gix::bstr::BString>::new())
        .map_err(git_err)?;
    for item in status {
        let item = item.map_err(git_err)?;
        match item {
            gix::status::index_worktree::iter::Item::Modification {
                entry, rela_path, ..
            } => {
                let path = String::from_utf8_lossy(rela_path.as_ref()).to_string();
                let index_bytes = read_blob_bytes(repo, entry.id).unwrap_or_default();
                let disk = fs::read(root.join(&path)).unwrap_or_default();
                let (insertions, removals) = line_stats(&index_bytes, &disk);
                unstaged.push(WorktreeFile {
                    path,
                    state: "unstaged".into(),
                    staged_additions: 0,
                    staged_deletions: 0,
                    unstaged_additions: insertions,
                    unstaged_deletions: removals,
                });
            }
            gix::status::index_worktree::iter::Item::DirectoryContents { entry, .. } => {
                let path = String::from_utf8_lossy(entry.rela_path.as_ref()).to_string();
                match entry.status {
                    gix::dir::entry::Status::Untracked => {
                        let additions = fs::read(root.join(&path))
                            .map(|bytes| line_count(&bytes))
                            .unwrap_or(0);
                        untracked.push(WorktreeFile {
                            path,
                            state: "untracked".into(),
                            staged_additions: 0,
                            staged_deletions: 0,
                            unstaged_additions: additions,
                            unstaged_deletions: 0,
                        });
                    }
                    gix::dir::entry::Status::Ignored(_) => ignored.push(WorktreeFile {
                        path,
                        state: "ignored".into(),
                        staged_additions: 0,
                        staged_deletions: 0,
                        unstaged_additions: 0,
                        unstaged_deletions: 0,
                    }),
                    _ => {}
                }
            }
            gix::status::index_worktree::iter::Item::Rewrite { .. } => {}
        }
    }

    let (tracking_branch, ahead_by, behind_by) = match &head_name {
        Some(name) => match find_tracking_branch(repo, name)? {
            Some(tracking) => {
                let upstream_id = repo
                    .find_reference(&format!("refs/remotes/{}", tracking))
                    .map_err(git_err)?
                    .peel_to_id_in_place()
                    .map_err(git_err)?
                    .detach();
                let head_id = repo.head_commit().map_err(git_err)?.id().detach();
                (
                    Some(tracking),
                    count_reachable(repo, head_id, upstream_id)?,
                    count_reachable(repo, upstream_id, head_id)?,
                )
            }
            None => (None, 0, 0),
        },
        None => (None, 0, 0),
    };

    let mut files = staged;
    files.extend(unstaged);
    files.extend(untracked);
    files.extend(ignored);
    let staged_paths = files
        .iter()
        .filter(|file| file.state == "staged")
        .map(|file| file.path.clone())
        .collect();
    let unstaged_paths = files
        .iter()
        .filter(|file| file.state == "unstaged")
        .map(|file| file.path.clone())
        .collect();
    let untracked_paths = files
        .iter()
        .filter(|file| file.state == "untracked")
        .map(|file| file.path.clone())
        .collect();
    let ignored_paths = files
        .iter()
        .filter(|file| file.state == "ignored")
        .map(|file| file.path.clone())
        .collect();

    Ok(WorktreeStatus {
        repo_path: root.to_string_lossy().to_string(),
        current_branch: head_name,
        head_sha,
        tracking_branch,
        ahead_by,
        behind_by,
        files,
        staged: staged_paths,
        unstaged: unstaged_paths,
        untracked: untracked_paths,
        ignored: ignored_paths,
    })
}

#[tauri::command]
async fn git_open_repository(args: GitOpenRepoArgs) -> RepoPilotResult<Option<WorktreeStatus>> {
    match open_repo(&args.path) {
        Ok(repo) => get_worktree_status(&repo).map(Some),
        Err(RepoPilotError::Git(_)) => Ok(None),
        Err(e) => Err(e),
    }
}

#[tauri::command]
async fn git_worktree_status(
    args: GitWorktreeStatusArgs,
) -> RepoPilotResult<Option<WorktreeStatus>> {
    match open_repo(&args.path) {
        Ok(repo) => get_worktree_status(&repo).map(Some),
        Err(RepoPilotError::Git(_)) => Ok(None),
        Err(e) => Err(e),
    }
}

fn commit_to_summary(commit: &gix::Commit<'_>) -> RepoPilotResult<CommitSummary> {
    let author = commit.author().map_err(git_err)?;
    let message = commit.message_raw().map_err(git_err)?;
    let subject = message.lines().next().unwrap_or_default().to_str_lossy();
    Ok(CommitSummary {
        sha: commit.id().to_hex().to_string(),
        short_sha: commit.id().to_hex().to_string()[..7].to_string(),
        message: message.to_str_lossy().to_string(),
        subject: subject.to_string(),
        author: CommitAuthor {
            name: author.name.to_str_lossy().to_string(),
            email: author.email.to_str_lossy().to_string(),
            login: None,
            avatar_url: None,
        },
        committed_at: author.time.format(gix::date::time::format::ISO8601_STRICT),
        parents: commit
            .parent_ids()
            .map(|parent| parent.to_hex().to_string())
            .collect(),
    })
}

fn commit_to_detail(repo: &Repository, commit: &gix::Commit<'_>) -> RepoPilotResult<CommitDetail> {
    let summary = commit_to_summary(commit)?;

    let tree = commit.tree().map_err(git_err)?;
    let parent_tree = commit
        .parent_ids()
        .next()
        .map(|parent| {
            let parent_commit = repo.find_commit(parent.detach()).map_err(git_err)?;
            parent_commit.tree().map_err(git_err)
        })
        .transpose()?;

    let mut changes = Vec::new();
    for change in repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None)
        .map_err(git_err)?
    {
        use gix::object::tree::diff::ChangeDetached;
        let path = String::from_utf8_lossy(change.location().as_ref()).to_string();
        let status = match change {
            ChangeDetached::Addition { .. } => "added",
            ChangeDetached::Deletion { .. } => "removed",
            ChangeDetached::Modification { .. } => "modified",
            ChangeDetached::Rewrite { copy, .. } => {
                if copy {
                    "added"
                } else {
                    "renamed"
                }
            }
        };
        changes.push(CommitFileChange {
            filename: path,
            status: status.to_string(),
            additions: 0,
            deletions: 0,
        });
    }

    Ok(CommitDetail {
        sha: summary.sha,
        short_sha: summary.short_sha,
        message: summary.message,
        subject: summary.subject,
        author: summary.author,
        committed_at: summary.committed_at,
        parents: commit
            .parent_ids()
            .map(|parent| parent.to_hex().to_string())
            .collect(),
        changes,
        additions: 0,
        deletions: 0,
        patch: None,
    })
}

fn branch_to_model(repo: &Repository, name: &str) -> RepoPilotResult<Branch> {
    let mut reference = repo.find_reference(name).map_err(git_err)?;
    let commit = reference
        .peel_to_id_in_place()
        .map_err(git_err)?
        .object()
        .map_err(git_err)?
        .try_into_commit()
        .map_err(git_err)?;
    Ok(Branch {
        name: name.strip_prefix("refs/heads/").unwrap_or(name).to_string(),
        is_protected: false,
        latest_commit: Some(commit_to_summary(&commit)?),
    })
}

#[tauri::command]
async fn git_list_branches(args: GitListBranchesArgs) -> RepoPilotResult<Vec<Branch>> {
    let repo = open_repo(&args.path)?;
    let mut branches = Vec::new();
    for reference in repo.references().map_err(git_err)?.all().map_err(git_err)? {
        let reference = reference.map_err(git_err)?;
        let name = reference.name().as_bstr().to_str_lossy();
        if name.starts_with("refs/heads/") {
            branches.push(branch_to_model(&repo, &name)?);
        }
    }
    Ok(branches)
}

#[tauri::command]
async fn git_list_commits(args: GitListCommitsArgs) -> RepoPilotResult<Vec<CommitSummary>> {
    let repo = open_repo(&args.path)?;
    let branch_name = args.branch.unwrap_or_else(|| {
        repo.head_name()
            .ok()
            .flatten()
            .map(|name| name.to_string())
            .unwrap_or_else(|| "HEAD".to_string())
    });

    let rev = if branch_name == "HEAD" {
        "HEAD".to_string()
    } else {
        format!("refs/heads/{}", branch_name)
    };
    let rev_bstr: &BStr = rev.as_bytes().as_bstr();
    let first = repo
        .rev_parse_single(rev_bstr)
        .map_err(git_err)?
        .object()
        .map_err(git_err)?
        .try_into_commit()
        .map_err(git_err)?;

    let limit = args.limit.unwrap_or(50);
    let mut commits = Vec::new();
    let mut current = Some(first);
    for _ in 0..limit {
        let Some(commit) = current else { break };
        commits.push(commit_to_summary(&commit)?);
        current = commit
            .parent_ids()
            .next()
            .and_then(|parent| repo.find_commit(parent.detach()).ok());
    }
    Ok(commits)
}

#[tauri::command]
async fn git_get_commit(args: GitGetCommitArgs) -> RepoPilotResult<CommitDetail> {
    let repo = open_repo(&args.path)?;
    let object_id = ObjectId::from_hex(args.sha.as_bytes()).map_err(git_err)?;
    let commit = repo.find_commit(object_id).map_err(git_err)?;
    commit_to_detail(&repo, &commit)
}

fn resolve_commit_id(repo: &Repository, name: &str) -> RepoPilotResult<ObjectId> {
    let rev = if name == "HEAD" {
        name.to_string()
    } else {
        format!("refs/heads/{}", name)
    };
    let rev_bstr: &BStr = rev.as_bytes().as_bstr();
    let commit = repo
        .rev_parse_single(rev_bstr)
        .map_err(git_err)?
        .object()
        .map_err(git_err)?
        .try_into_commit()
        .map_err(git_err)?;
    Ok(commit.id().detach())
}

/// Collect path/status/line-stat rows for the diff between two commits.
fn files_between_commits(
    repo: &Repository,
    base_id: Option<ObjectId>,
    target_id: ObjectId,
) -> RepoPilotResult<Vec<RefComparisonFile>> {
    use gix::object::tree::diff::Change;

    let target_tree = repo
        .find_commit(target_id)
        .map_err(git_err)?
        .tree()
        .map_err(git_err)?;
    let base_tree = base_id
        .map(|id| {
            repo.find_commit(id)
                .map_err(git_err)
                .and_then(|commit| commit.tree().map_err(git_err))
        })
        .transpose()?;

    let mut out: Vec<RefComparisonFile> = Vec::new();
    if let Some(base_tree) = base_tree.as_ref() {
        let mut platform = base_tree.changes().map_err(git_err)?;
        platform
            .for_each_to_obtain_tree(&target_tree, |change| {
                use gix::object::tree::diff::Action;
                let mut cache = repo
                    .diff_resource_cache_for_tree_diff()
                    .map_err(|e| RepoPilotError::Git(e.to_string()))?;
                let (insertions, removals) = change
                    .diff(&mut cache)
                    .ok()
                    .and_then(|mut platform| platform.line_counts().ok())
                    .flatten()
                    .map(|counts| (counts.insertions, counts.removals))
                    .unwrap_or_default();
                let status = match change {
                    Change::Addition { .. } => "added",
                    Change::Deletion { .. } => "removed",
                    Change::Modification { .. } => "modified",
                    Change::Rewrite { copy, .. } => {
                        if copy {
                            "added"
                        } else {
                            "renamed"
                        }
                    }
                };
                out.push(RefComparisonFile {
                    path: String::from_utf8_lossy(change.location().as_ref()).to_string(),
                    status: status.to_string(),
                    additions: insertions,
                    deletions: removals,
                });
                Ok::<_, RepoPilotError>(Action::Continue)
            })
            .map_err(git_err)?;
    }
    Ok(out)
}

/// Commit summaries reachable from `target` but not from `base` (limit 50).
fn commits_between(
    repo: &Repository,
    target: ObjectId,
    base: ObjectId,
) -> RepoPilotResult<Vec<CommitSummary>> {
    let mut commits = Vec::new();
    for item in repo
        .rev_walk([target])
        .with_pruned([base])
        .all()
        .map_err(git_err)?
        .take(50)
    {
        let info = item.map_err(git_err)?;
        let commit = repo.find_commit(info.id).map_err(git_err)?;
        commits.push(commit_to_summary(&commit)?);
    }
    Ok(commits)
}

/// Paths that both sides touch relative to the merge base.
fn overlapping_paths(ours: Vec<RefComparisonFile>, theirs: Vec<RefComparisonFile>) -> Vec<String> {
    let mut ours_paths: Vec<String> = ours.into_iter().map(|file| file.path).collect();
    let mut theirs_paths: Vec<String> = theirs.into_iter().map(|file| file.path).collect();
    ours_paths.sort();
    ours_paths.dedup();
    theirs_paths.sort();
    theirs_paths.dedup();
    let mut out = Vec::new();
    for path in ours_paths {
        if theirs_paths.binary_search(&path).is_ok() {
            out.push(path);
        }
    }
    out
}

/// Diff summary between two commits (base -> target).
fn tree_changes_between(
    repo: &Repository,
    base_id: ObjectId,
    target_id: ObjectId,
) -> RepoPilotResult<Vec<RefComparisonFile>> {
    files_between_commits(repo, Some(base_id), target_id)
}

/// Last reflog entry timestamp matching a keyword (fetch/pull/push), if any.
/// Reads `logs/HEAD` directly: each line is `<old> <new> <unix> <tz>\t<message>`.
fn reflog_last_by_keyword(repo: &Repository, keyword: &str) -> RepoPilotResult<Option<String>> {
    let path = repo.git_dir().join("logs").join("HEAD");
    let content = match fs::read_to_string(&path) {
        Ok(content) => content,
        Err(_) => return Ok(None),
    };
    let mut out = None;
    for line in content.lines() {
        let message = match line.split_once('\t') {
            Some((_, message)) => message,
            None => continue,
        };
        if !message.contains(keyword) {
            continue;
        }
        if let Some(unix) = line.split(' ').nth(2) {
            if let Ok(seconds) = unix.parse::<i64>() {
                out = Some(seconds.to_string());
            }
        }
    }
    Ok(out)
}

#[tauri::command]
async fn git_file_diff(args: GitFileDiffArgs) -> RepoPilotResult<Option<FileDiff>> {
    let repo = open_repo(&args.path)?;
    let root = worktree_root(&repo);
    let spec = args.spec;

    let before: Vec<u8> = match spec.base.as_str() {
        "HEAD" => match repo.head_commit() {
            Ok(head) => blob_at_tree(&repo, head.tree().map_err(git_err)?.id, &spec.path)?
                .unwrap_or_default(),
            Err(_) => Vec::new(),
        },
        "index" => {
            let index = repo.index_or_load_from_head().map_err(git_err)?;
            let entry_path: &BStr = spec.path.as_bytes().as_bstr();
            match index.entry_by_path(entry_path) {
                Some(entry) => read_blob_bytes(&repo, entry.id)?,
                None => Vec::new(),
            }
        }
        other => {
            return Err(RepoPilotError::Unsupported(format!(
                "Unknown diff base '{}'",
                other
            )))
        }
    };

    let after: Vec<u8> = match spec.target.as_str() {
        "index" => {
            let index = repo.index_or_load_from_head().map_err(git_err)?;
            let entry_path: &BStr = spec.path.as_bytes().as_bstr();
            match index.entry_by_path(entry_path) {
                Some(entry) => read_blob_bytes(&repo, entry.id)?,
                None => Vec::new(),
            }
        }
        "worktree" => fs::read(root.join(&spec.path)).unwrap_or_default(),
        other => return Err(RepoPilotError::InvalidRef(other.into())),
    };

    let status = if before.is_empty() {
        "added"
    } else if after.is_empty() {
        "removed"
    } else {
        "modified"
    };

    let (additions, deletions) = line_stats(&before, &after);
    let patch = if spec.base == "HEAD" || spec.target == "index" {
        render_unified_patch(&before, &after)
    } else {
        Some(String::new())
    };
    let binary = is_binary(&before) || is_binary(&after);

    Ok(Some(FileDiff {
        path: spec.path,
        status: status.to_string(),
        additions,
        deletions,
        patch: if binary { None } else { patch },
        binary,
    }))
}

#[tauri::command]
async fn git_compare_refs(args: GitCompareRefsArgs) -> RepoPilotResult<RefComparison> {
    let repo = open_repo(&args.path)?;
    let base_id = resolve_commit_id(&repo, &args.base_ref)?;
    let target_id = resolve_commit_id(&repo, &args.target_ref)?;

    let merge_base_id = repo.merge_base(base_id, target_id).ok();
    let merge_base = merge_base_id
        .as_ref()
        .map(|id| id.detach().to_hex().to_string());

    let ahead_by = count_reachable(&repo, target_id, base_id)?;
    let behind_by = count_reachable(&repo, base_id, target_id)?;
    let commits = commits_between(&repo, target_id, base_id)?;
    let files = match merge_base_id.as_ref() {
        Some(mb) => tree_changes_between(&repo, mb.detach(), target_id)?,
        None => Vec::new(),
    };

    let conflict_paths = match merge_base_id.as_ref() {
        Some(mb) => {
            let mb = mb.detach();
            overlapping_paths(
                tree_changes_between(&repo, mb, base_id)?,
                tree_changes_between(&repo, mb, target_id)?,
            )
        }
        None => Vec::new(),
    };

    Ok(RefComparison {
        base_ref: args.base_ref,
        target_ref: args.target_ref,
        merge_base,
        ahead_by,
        behind_by,
        commits,
        files,
        conflict_paths,
    })
}

#[tauri::command]
async fn git_merge_preview(args: GitMergePreviewArgs) -> RepoPilotResult<MergePreview> {
    let repo = open_repo(&args.path)?;
    let head_id = resolve_commit_id(&repo, &args.head_ref)?;
    let target_id = resolve_commit_id(&repo, &args.target_ref)?;

    let merge_base_id = repo.merge_base(head_id, target_id).ok();
    let merge_base = merge_base_id
        .as_ref()
        .map(|id| id.detach().to_hex().to_string());

    let fast_forward = merge_base_id
        .as_ref()
        .map(|mb| mb.detach() == head_id)
        .unwrap_or(false);
    let commits_ahead = count_reachable(&repo, head_id, target_id)?;
    let files_changed = match merge_base_id.as_ref() {
        Some(base) => tree_changes_between(&repo, base.detach(), head_id)?,
        None => tree_changes_between(&repo, head_id, target_id)?,
    };

    let conflict_paths = match merge_base_id.as_ref() {
        Some(base) => {
            let base = base.detach();
            overlapping_paths(
                tree_changes_between(&repo, base, head_id)?,
                tree_changes_between(&repo, base, target_id)?,
            )
        }
        None => Vec::new(),
    };

    let can_merge = !fast_forward && conflict_paths.is_empty();

    Ok(MergePreview {
        head_ref: args.head_ref,
        target_ref: args.target_ref,
        merge_base,
        fast_forward,
        commits_ahead,
        files_changed,
        conflict_paths,
        can_merge,
    })
}

#[tauri::command]
async fn git_sync_log(args: GitSyncLogArgs) -> RepoPilotResult<SyncLog> {
    let repo = open_repo(&args.path)?;
    Ok(SyncLog {
        fetch_at: reflog_last_by_keyword(&repo, "fetch")?,
        pull_at: reflog_last_by_keyword(&repo, "pull")?,
        push_at: reflog_last_by_keyword(&repo, "push")?,
    })
}

fn fallback_signature() -> gix::actor::Signature {
    gix::actor::Signature {
        name: "Repo Pilot User".into(),
        email: "user@repopilot.local".into(),
        time: gix::date::Time::now_local_or_utc(),
    }
}

/// Use the repository's configured identity when present, otherwise a
/// clearly-labelled Repo Pilot fallback identity.
fn commit_signatures(repo: &Repository) -> (gix::actor::Signature, gix::actor::Signature) {
    let configured = |value: Option<
        std::result::Result<gix::actor::SignatureRef<'_>, gix::config::time::Error>,
    >| {
        value
            .and_then(|result| result.ok())
            .map(|signature| signature.to_owned())
    };
    let author = configured(repo.author()).unwrap_or_else(fallback_signature);
    let committer = configured(repo.committer()).unwrap_or_else(fallback_signature);
    (author, committer)
}

#[cfg(unix)]
fn fs_entry_mode(metadata: &std::fs::Metadata) -> gix::index::entry::Mode {
    use std::os::unix::fs::PermissionsExt;
    if metadata.file_type().is_symlink() {
        gix::index::entry::Mode::SYMLINK
    } else if metadata.permissions().mode() & 0o111 != 0 {
        gix::index::entry::Mode::FILE_EXECUTABLE
    } else {
        gix::index::entry::Mode::FILE
    }
}

#[cfg(not(unix))]
fn fs_entry_mode(_metadata: &std::fs::Metadata) -> gix::index::entry::Mode {
    gix::index::entry::Mode::FILE
}

/// Stage a single repository-relative path (create or update the index entry).
fn stage_path(repo: &Repository, root: &Path, relative: &str) -> RepoPilotResult<()> {
    let path = root.join(relative);
    let bytes = fs::read(&path)?;
    let blob_id = repo.write_blob(bytes).map_err(git_err)?.detach();
    let metadata = std::fs::symlink_metadata(&path)?;
    let stat = gix::index::fs::Metadata::from_path_no_follow(&path)?;
    let stat = gix::index::entry::Stat::from_fs(&stat).map_err(git_err)?;
    let mode = fs_entry_mode(&metadata);

    let mut index = repo
        .index_or_load_from_head()
        .map_err(git_err)?
        .into_owned();
    let entry_path: &BStr = relative.as_bytes().as_bstr();
    if let Some(entry_index) =
        index.entry_index_by_path_and_stage(entry_path, gix::index::entry::Stage::Unconflicted)
    {
        index.entries_mut()[entry_index].id = blob_id;
        index.entries_mut()[entry_index].stat = stat;
        index.entries_mut()[entry_index].mode = mode;
    } else {
        index.dangerously_push_entry(
            stat,
            blob_id,
            gix::index::entry::Flags::empty(),
            mode,
            entry_path,
        );
        index.sort_entries();
    }
    index
        .write(gix::index::write::Options::default())
        .map_err(git_err)?;
    Ok(())
}

/// Delete a repository-relative path from disk (untracked discard).
fn delete_path(root: &Path, relative: &str) -> RepoPilotResult<()> {
    let path = root.join(relative);
    if path.is_dir() {
        fs::remove_dir_all(&path)?;
    } else {
        fs::remove_file(&path)?;
    }
    Ok(())
}

fn commit_message(repo: &Repository, message: &str) -> RepoPilotResult<ObjectId> {
    let tree_id = tree_id_from_index(repo)?;
    let parents: Vec<ObjectId> = match repo.head_commit() {
        Ok(head) => vec![head.id().detach()],
        Err(_) => Vec::new(),
    };
    let (author, committer) = commit_signatures(repo);
    repo.commit_as(&committer, &author, "HEAD", message, tree_id, parents)
        .map_err(git_err)
        .map(|id| id.detach())
}

/// Run a system-git operation, mapping a failed run to a user-facing result
/// (the UI surfaces `ok:false` with the message via its mutation toast).
fn run_git_op(
    opts: &git_system::GitRunOptions,
    success_message: impl FnOnce() -> String,
) -> RepoPilotResult<GitOperationResult> {
    let output = git_system::run_git_sync(opts)?;
    if output.ok() {
        Ok(GitOperationResult {
            ok: true,
            message: success_message(),
            unsupported: None,
        })
    } else {
        Ok(GitOperationResult {
            ok: false,
            message: git_system::last_error_message(&output),
            unsupported: None,
        })
    }
}

#[tauri::command]
async fn git_run_operation(
    app: tauri::AppHandle,
    args: GitRunOperationArgs,
) -> RepoPilotResult<GitOperationResult> {
    let operation = args.operation.as_str();

    // Network operations stream progress through system git.
    match operation {
        "fetch" => {
            let remote = args.payload.get("remote").and_then(|value| value.as_str());
            let account = args
                .payload
                .get("accountLogin")
                .and_then(|value| value.as_str());
            let result =
                git_system::git_fetch(&app, "git-run-operation", &args.repo_path, remote, account)
                    .await?;
            if result.ok {
                emit_repo_changed(&app, &args.repo_path);
            }
            return Ok(result);
        }
        "pull" => {
            let remote = args.payload.get("remote").and_then(|value| value.as_str());
            let branch = args.payload.get("branch").and_then(|value| value.as_str());
            let rebase = args
                .payload
                .get("rebase")
                .and_then(|value| value.as_bool())
                .unwrap_or(false);
            let account = args
                .payload
                .get("accountLogin")
                .and_then(|value| value.as_str());
            let result = git_system::git_pull(
                &app,
                "git-run-operation",
                &args.repo_path,
                remote,
                branch,
                rebase,
                account,
            )
            .await?;
            if result.ok {
                emit_repo_changed(&app, &args.repo_path);
            }
            return Ok(result);
        }
        "push" => {
            let remote = args.payload.get("remote").and_then(|value| value.as_str());
            let branch = args.payload.get("branch").and_then(|value| value.as_str());
            let set_upstream = args
                .payload
                .get("setUpstream")
                .and_then(|value| value.as_bool())
                .unwrap_or(false);
            let account = args
                .payload
                .get("accountLogin")
                .and_then(|value| value.as_str());
            let result = git_system::git_push(
                &app,
                "git-run-operation",
                &args.repo_path,
                remote,
                branch,
                set_upstream,
                account,
            )
            .await?;
            if result.ok {
                emit_repo_changed(&app, &args.repo_path);
            }
            return Ok(result);
        }
        _ => {}
    }

    let repo = open_repo(&args.repo_path)?;
    let root = worktree_root(&repo);

    let mut mutated = false;
    let result = match operation {
        "stage" => {
            let paths = args
                .payload
                .get("paths")
                .and_then(|value| value.as_array())
                .ok_or_else(|| RepoPilotError::Git("Missing paths".into()))?;
            for path in paths {
                let Some(path) = path.as_str() else { continue };
                stage_path(&repo, &root, path)?;
            }
            mutated = true;
            Ok(GitOperationResult { ok: true, message: "Files staged".into(), unsupported: None })
        }
        "stage-all" => {
            let status = get_worktree_status(&repo)?;
            let mut count = 0usize;
            for path in status.unstaged.iter().chain(status.untracked.iter()) {
                stage_path(&repo, &root, path)?;
                count += 1;
            }
            mutated = true;
            Ok(GitOperationResult {
                ok: true,
                message: if count > 0 {
                    format!("Staged {count} file(s)")
                } else {
                    "Nothing to stage".into()
                },
                unsupported: None,
            })
        }
        "unstage" => {
            let paths = args
                .payload
                .get("paths")
                .and_then(|value| value.as_array())
                .ok_or_else(|| RepoPilotError::Git("Missing paths".into()))?;
            let mut index = repo
                .index_or_load_from_head()
                .map_err(git_err)?
                .into_owned();
            for path in paths {
                let Some(path) = path.as_str() else { continue };
                let entry_path: &BStr = path.as_bytes().as_bstr();
                index.remove_entries(|_, candidate, _| candidate == entry_path);
            }
            index
                .write(gix::index::write::Options::default())
                .map_err(git_err)?;
            mutated = true;
            Ok(GitOperationResult { ok: true, message: "Files unstaged".into(), unsupported: None })
        }
        "unstage-all" => {
            let status = get_worktree_status(&repo)?;
            let mut index = repo
                .index_or_load_from_head()
                .map_err(git_err)?
                .into_owned();
            for path in status.staged {
                let entry_path: &BStr = path.as_bytes().as_bstr();
                index.remove_entries(|_, candidate, _| candidate == entry_path);
            }
            index
                .write(gix::index::write::Options::default())
                .map_err(git_err)?;
            mutated = true;
            Ok(GitOperationResult { ok: true, message: "All files unstaged".into(), unsupported: None })
        }
        "restore" => {
            let paths: Vec<String> = args
                .payload
                .get("files")
                .and_then(|value| value.as_array())
                .map(|array| {
                    array
                        .iter()
                        .filter_map(|value| value.as_str().map(str::to_string))
                        .collect()
                })
                .ok_or_else(|| RepoPilotError::Git("Missing files".into()))?;
            if paths.is_empty() {
                return Err(RepoPilotError::Git("No files to restore".into()));
            }
            let status = get_worktree_status(&repo)?;
            let untracked: HashSet<&str> = status.untracked.iter().map(String::as_str).collect();
            let mut opts = git_system::GitRunOptions {
                cwd: Some(root.clone()),
                args: vec![
                    "restore".into(),
                    "--staged".into(),
                    "--worktree".into(),
                    "--".into(),
                ],
                extra_env: Vec::new(),
                auth: None,
            };
            let mut deleted = false;
            for path in &paths {
                if untracked.contains(path.as_str()) {
                    delete_path(&root, path)?;
                    deleted = true;
                } else {
                    opts.args.push(path.clone());
                }
            }
            let tracked = opts.args.len() > 4;
            if tracked {
                let output = git_system::run_git_sync(&opts)?;
                if !output.ok() {
                    return Ok(GitOperationResult {
                        ok: false,
                        message: git_system::last_error_message(&output),
                        unsupported: None,
                    });
                }
            }
            mutated = true;
            let message = if deleted && tracked {
                "Changes discarded"
            } else if tracked {
                "Changes restored to HEAD"
            } else {
                "Untracked files removed"
            };
            Ok(GitOperationResult { ok: true, message: message.into(), unsupported: None })
        }
        "commit" => {
            let message = args
                .payload
                .get("message")
                .and_then(|value| value.as_str())
                .ok_or_else(|| RepoPilotError::Git("Missing message".into()))?;
            if message.trim().is_empty() {
                return Err(RepoPilotError::Git("Commit message cannot be empty".into()));
            }
            let amend = args.payload.get("amend").and_then(|value| value.as_bool()).unwrap_or(false);
            let empty = args.payload.get("empty").and_then(|value| value.as_bool()).unwrap_or(false);
            let signed = args.payload.get("signed").and_then(|value| value.as_bool()).unwrap_or(false);
            if signed || amend {
                // System git handles signing and amending (including together);
                // it commits the staged index exactly like the gix path below.
                let mut opts = git_system::GitRunOptions {
                    cwd: Some(root),
                    args: vec!["commit".into()],
                    extra_env: Vec::new(),
                    auth: None,
                };
                if signed {
                    opts.args.push("-S".into());
                }
                if amend {
                    opts.args.push("--amend".into());
                }
                if empty {
                    opts.args.push("--allow-empty".into());
                }
                opts.args.push("-m".into());
                opts.args.push(message.to_string());
                let output = git_system::run_git_sync(&opts)?;
                if !output.ok() {
                    return Ok(GitOperationResult {
                        ok: false,
                        message: git_system::last_error_message(&output),
                        unsupported: None,
                    });
                }
                mutated = true;
                let sha = repo.head_commit().map_err(git_err)?.id().to_hex().to_string();
                Ok(GitOperationResult {
                    ok: true,
                    message: format!("Committed {}", &sha[..7.min(sha.len())]),
                    unsupported: None,
                })
            } else {
                let id = commit_message(&repo, message)?;
                mutated = true;
                Ok(GitOperationResult {
                    ok: true,
                    message: format!("Committed {}", &id.to_hex().to_string()[..7]),
                    unsupported: None,
                })
            }
        }
        "create-branch" => {
            let branch = args
                .payload
                .get("branch")
                .and_then(|value| value.as_str())
                .or_else(|| args.payload.get("name").and_then(|value| value.as_str()))
                .ok_or_else(|| RepoPilotError::Git("Missing branch".into()))?;
            let start_point = args.payload.get("startPoint").and_then(|value| value.as_str());
            if let Some(start_point) = start_point {
                let opts = git_system::GitRunOptions {
                    cwd: Some(root),
                    args: vec!["branch".into(), branch.to_string(), start_point.to_string()],
                    extra_env: Vec::new(),
                    auth: None,
                };
                let result = run_git_op(&opts, || format!("Created branch {}", branch))?;
                mutated = true;
                Ok(result)
            } else {
                let ref_name = format!("refs/heads/{}", branch);
                let head_id = repo.head_commit().map_err(git_err)?.id().detach();
                repo.reference(
                    ref_name,
                    head_id,
                    gix::refs::transaction::PreviousValue::MustNotExist,
                    gix::bstr::BString::from("create-branch"),
                )
                .map_err(git_err)?;
                mutated = true;
                Ok(GitOperationResult { ok: true, message: format!("Created branch {}", branch), unsupported: None })
            }
        }
        "delete-branch" => {
            let branch = args
                .payload
                .get("branch")
                .and_then(|value| value.as_str())
                .ok_or_else(|| RepoPilotError::Git("Missing branch".into()))?;
            let ref_name = format!("refs/heads/{}", branch);
            let full_name = FullName::try_from(ref_name).map_err(|_| RepoPilotError::InvalidRef(branch.into()))?;
            repo.edit_reference(gix::refs::transaction::RefEdit {
                change: Change::Delete {
                    expected: PreviousValue::Any,
                    log: RefLog::AndReference,
                },
                name: full_name,
                deref: false,
            })
            .map_err(git_err)?;
            mutated = true;
            Ok(GitOperationResult { ok: true, message: format!("Deleted branch {}", branch), unsupported: None })
        }
        "rename-branch" => {
            let old_name = args
                .payload
                .get("oldName")
                .and_then(|value| value.as_str())
                .ok_or_else(|| RepoPilotError::Git("Missing oldName".into()))?;
            let new_name = args
                .payload
                .get("newName")
                .and_then(|value| value.as_str())
                .ok_or_else(|| RepoPilotError::Git("Missing newName".into()))?;
            let opts = git_system::GitRunOptions {
                cwd: Some(root),
                args: vec!["branch".into(), "-m".into(), old_name.to_string(), new_name.to_string()],
                extra_env: Vec::new(),
                auth: None,
            };
            let result = run_git_op(&opts, || format!("Renamed {} to {}", old_name, new_name))?;
            mutated = true;
            Ok(result)
        }
        "checkout" => {
            let branch = args
                .payload
                .get("branch")
                .and_then(|value| value.as_str())
                .ok_or_else(|| RepoPilotError::Git("Missing branch".into()))?;
            let create = args.payload.get("create").and_then(|value| value.as_bool()).unwrap_or(false);
            let start_point = args.payload.get("startPoint").and_then(|value| value.as_str());
            let mut opts = git_system::GitRunOptions {
                cwd: Some(root),
                args: vec!["checkout".into()],
                extra_env: Vec::new(),
                auth: None,
            };
            if create {
                opts.args.push("-b".into());
            }
            opts.args.push(branch.to_string());
            if let Some(start_point) = start_point {
                opts.args.push(start_point.to_string());
            }
            let result = run_git_op(&opts, || format!("Switched to {}", branch))?;
            mutated = true;
            Ok(result)
        }
        "create-tag" => {
            let tag = args
                .payload
                .get("tag")
                .and_then(|value| value.as_str())
                .or_else(|| args.payload.get("name").and_then(|value| value.as_str()))
                .ok_or_else(|| RepoPilotError::Git("Missing tag".into()))?;
            let message = args.payload.get("message").and_then(|value| value.as_str());
            let target = args.payload.get("target").and_then(|value| value.as_str());
            let mut opts = git_system::GitRunOptions {
                cwd: Some(root),
                args: vec!["tag".into()],
                extra_env: Vec::new(),
                auth: None,
            };
            if let Some(message) = message {
                opts.args.push("-a".into());
                opts.args.push("-m".into());
                opts.args.push(message.to_string());
            }
            opts.args.push(tag.to_string());
            if let Some(target) = target {
                opts.args.push(target.to_string());
            }
            let result = run_git_op(&opts, || format!("Created tag {}", tag))?;
            mutated = true;
            Ok(result)
        }
        "delete-tag" => {
            let tag = args
                .payload
                .get("tag")
                .and_then(|value| value.as_str())
                .ok_or_else(|| RepoPilotError::Git("Missing tag".into()))?;
            let opts = git_system::GitRunOptions {
                cwd: Some(root),
                args: vec!["tag".into(), "-d".into(), tag.to_string()],
                extra_env: Vec::new(),
                auth: None,
            };
            let result = run_git_op(&opts, || format!("Deleted tag {}", tag))?;
            mutated = true;
            Ok(result)
        }
        "stash" => {
            let action = args.payload.get("action").and_then(|value| value.as_str()).unwrap_or("push");
            let mut args_vec = vec!["stash".to_string()];
            match action {
                "pop" => args_vec.push("pop".to_string()),
                "list" => args_vec.push("list".to_string()),
                "drop" => {
                    args_vec.push("drop".to_string());
                    if let Some(stash) = args.payload.get("stash").and_then(|value| value.as_str()) {
                        args_vec.push(stash.to_string());
                    }
                }
                _ => {
                    args_vec.push("push".to_string());
                    if let Some(message) = args.payload.get("message").and_then(|value| value.as_str()) {
                        args_vec.push("-m".to_string());
                        args_vec.push(message.to_string());
                    }
                }
            }
            let opts = git_system::GitRunOptions {
                cwd: Some(root),
                args: args_vec,
                extra_env: Vec::new(),
                auth: None,
            };
            let output = git_system::run_git_sync(&opts)?;
            if !output.ok() {
                return Ok(GitOperationResult {
                    ok: false,
                    message: git_system::last_error_message(&output),
                    unsupported: None,
                });
            }
            mutated = action != "list";
            let message = if action == "list" {
                let list = output.stdout.trim();
                if list.is_empty() {
                    "No stashes".to_string()
                } else {
                    list.to_string()
                }
            } else {
                "Stash updated".to_string()
            };
            Ok(GitOperationResult { ok: true, message, unsupported: None })
        }
        "cherry-pick" => {
            let commit = args
                .payload
                .get("commit")
                .and_then(|value| value.as_str())
                .ok_or_else(|| RepoPilotError::Git("Missing commit".into()))?;
            let opts = git_system::GitRunOptions {
                cwd: Some(root),
                args: vec!["cherry-pick".into(), commit.to_string()],
                extra_env: Vec::new(),
                auth: None,
            };
            let result = run_git_op(&opts, || format!("Cherry-picked {}", commit))?;
            mutated = true;
            Ok(result)
        }
        "revert" => {
            let commit = args
                .payload
                .get("commit")
                .and_then(|value| value.as_str())
                .ok_or_else(|| RepoPilotError::Git("Missing commit".into()))?;
            let opts = git_system::GitRunOptions {
                cwd: Some(root),
                args: vec!["revert".into(), "--no-edit".into(), commit.to_string()],
                extra_env: Vec::new(),
                auth: None,
            };
            let result = run_git_op(&opts, || format!("Reverted {}", commit))?;
            mutated = true;
            Ok(result)
        }
        "rebase" => {
            let target = args
                .payload
                .get("target")
                .and_then(|value| value.as_str())
                .ok_or_else(|| RepoPilotError::Git("Missing target".into()))?;
            let opts = git_system::GitRunOptions {
                cwd: Some(root),
                args: vec!["rebase".into(), target.to_string()],
                extra_env: Vec::new(),
                auth: None,
            };
            let result = run_git_op(&opts, || format!("Rebased onto {}", target))?;
            mutated = true;
            Ok(result)
        }
        "merge" => {
            let branch = args
                .payload
                .get("branch")
                .and_then(|value| value.as_str())
                .ok_or_else(|| RepoPilotError::Git("Missing branch".into()))?;
            let opts = git_system::GitRunOptions {
                cwd: Some(root),
                args: vec!["merge".into(), "--no-edit".into(), branch.to_string()],
                extra_env: Vec::new(),
                auth: None,
            };
            let result = run_git_op(&opts, || format!("Merged {}", branch))?;
            mutated = true;
            Ok(result)
        }
        "squash-merge" => {
            let branch = args
                .payload
                .get("branch")
                .and_then(|value| value.as_str())
                .ok_or_else(|| RepoPilotError::Git("Missing branch".into()))?;
            let merge_opts = git_system::GitRunOptions {
                cwd: Some(root.clone()),
                args: vec!["merge".into(), "--squash".into(), branch.to_string()],
                extra_env: Vec::new(),
                auth: None,
            };
            let merge_output = git_system::run_git_sync(&merge_opts)?;
            if !merge_output.ok() {
                return Ok(GitOperationResult {
                    ok: false,
                    message: git_system::last_error_message(&merge_output),
                    unsupported: None,
                });
            }
            let commit_opts = git_system::GitRunOptions {
                cwd: Some(root),
                args: vec!["commit".into(), "--no-edit".into()],
                extra_env: Vec::new(),
                auth: None,
            };
            let commit_output = git_system::run_git_sync(&commit_opts)?;
            if !commit_output.ok() {
                return Ok(GitOperationResult {
                    ok: false,
                    message: git_system::last_error_message(&commit_output),
                    unsupported: None,
                });
            }
            mutated = true;
            Ok(GitOperationResult { ok: true, message: format!("Squash-merged {}", branch), unsupported: None })
        }
        "reset" => {
            let mode = args.payload.get("mode").and_then(|value| value.as_str()).unwrap_or("mixed");
            if !matches!(mode, "soft" | "mixed" | "hard") {
                return Err(RepoPilotError::Git(format!("Unknown reset mode '{}'", mode)));
            }
            let target = args.payload.get("target").and_then(|value| value.as_str()).unwrap_or("HEAD");
            let opts = git_system::GitRunOptions {
                cwd: Some(root),
                args: vec!["reset".into(), format!("--{}", mode), target.to_string()],
                extra_env: Vec::new(),
                auth: None,
            };
            let result = run_git_op(&opts, || format!("Reset --{} to {}", mode, target))?;
            mutated = true;
            Ok(result)
        }
        "compare-branches" => {
            let branch = args
                .payload
                .get("branch")
                .and_then(|value| value.as_str())
                .ok_or_else(|| RepoPilotError::Git("Missing branch".into()))?;
            let head = repo
                .head_name()
                .ok()
                .flatten()
                .map(|name| name.shorten().to_str_lossy().to_string())
                .unwrap_or_else(|| "HEAD".to_string());
            let base_id = resolve_commit_id(&repo, &head)?;
            let target_id = resolve_commit_id(&repo, branch)?;
            let ahead = count_reachable(&repo, target_id, base_id)?;
            let behind = count_reachable(&repo, base_id, target_id)?;
            let files = tree_changes_between(&repo, base_id, target_id)?;
            Ok(GitOperationResult {
                ok: true,
                message: format!(
                    "compare {head}..{branch}: {ahead} ahead, {behind} behind, {} file(s)",
                    files.len()
                ),
                unsupported: None,
            })
        }
        _ => Ok(GitOperationResult {
            ok: false,
            message: format!(
                "The '{}' operation is not implemented yet in the desktop runtime; it will arrive in a later phase.",
                args.operation
            ),
            unsupported: Some(true),
        }),
    };

    if mutated {
        if let Ok(outcome) = &result {
            if outcome.ok {
                emit_repo_changed(&app, &args.repo_path);
            }
        }
    }
    result
}

#[tauri::command]
async fn git_run_in_sandbox(args: GitRunInSandboxArgs) -> RepoPilotResult<GitOperationResult> {
    let temp_dir = TempDir::new()?;
    let sandbox_path = temp_dir.path().join(&args.sandbox_seed);
    fs::create_dir_all(&sandbox_path)?;
    fs::write(
        sandbox_path.join("seed.txt"),
        format!("Sandbox seed: {}\n", args.sandbox_seed),
    )?;

    let repo = gix::init(&sandbox_path).map_err(git_err)?;
    let root = worktree_root(&repo);
    stage_path(&repo, &root, "seed.txt")?;

    let result = match args.operation.as_str() {
        "commit" => {
            let message = args
                .payload
                .get("message")
                .and_then(|value| value.as_str())
                .unwrap_or("Sandbox commit");
            let id = commit_message(&repo, message)?;
            Ok(GitOperationResult {
                ok: true,
                message: format!("Sandbox commit created {}", &id.to_hex().to_string()[..7]),
                unsupported: None,
            })
        }
        _ => Ok(GitOperationResult {
            ok: false,
            message: format!(
                "Sandbox operation '{}' is not implemented yet in the desktop runtime.",
                args.operation
            ),
            unsupported: Some(true),
        }),
    };

    drop(temp_dir);
    result
}

#[tauri::command]
async fn pick_repository_folder(app: tauri::AppHandle) -> RepoPilotResult<Option<String>> {
    use tauri_plugin_dialog::DialogExt;
    let dialog = app.dialog().clone();
    let picked = tauri::async_runtime::spawn_blocking(move || {
        tauri_plugin_dialog::FileDialogBuilder::new(dialog).blocking_pick_folder()
    })
    .await
    .map_err(git_err)?;
    Ok(picked
        .as_ref()
        .and_then(|file_path| file_path.as_path())
        .and_then(|path| path.to_str())
        .map(|s| s.to_string()))
}

/// Open an http(s) URL in the system's default browser.
///
/// Used by the GitHub OAuth Device Flow so sign-in does not depend on the
/// webview's window handling. Only http(s) URLs are accepted; the command
/// refuses anything else to avoid treating app data as a command target.
#[tauri::command]
async fn open_external(url: String) -> RepoPilotResult<()> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err(RepoPilotError::Unsupported(format!(
            "Refusing to open non-HTTP URL: {url}"
        )));
    }
    open_in_browser(&url)?;
    Ok(())
}

fn open_in_browser(url: &str) -> std::io::Result<()> {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(url).spawn()?;
    }
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", "", url])
            .spawn()?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let _ = std::process::Command::new("xdg-open").arg(url).spawn()?;
    }
    Ok(())
}

/// Emit a `git://repo-changed` event for a repository path. The frontend
/// invalidates its `["local", ...]` queries in response.
pub(crate) fn emit_repo_changed(app: &tauri::AppHandle, path: &str) {
    let _ = app.emit("git://repo-changed", serde_json::json!({ "path": path }));
}

/// Backend file-watch registry: one debounced watcher, a set of watched
/// repository roots. Stored in Tauri state (`Mutex<WatchRegistry>`).
struct WatchRegistry {
    debouncer: Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>,
    watched: HashSet<PathBuf>,
}

/// Watch repository paths and emit `git://repo-changed` (debounced) when
/// files change under them, so worktree/branch queries invalidate promptly
/// even when the change comes from outside the app.
#[tauri::command]
async fn git_watch_paths(app: tauri::AppHandle, paths: Vec<String>) -> RepoPilotResult<bool> {
    use notify::RecursiveMode;
    use notify_debouncer_mini::{new_debouncer, DebounceEventResult};
    use std::time::Duration;

    let state = app.state::<Mutex<WatchRegistry>>();
    let mut registry = state.lock().unwrap();
    if registry.debouncer.is_none() {
        let app_for_watcher = app.clone();
        let debouncer = new_debouncer(
            Duration::from_millis(400),
            move |result: DebounceEventResult| {
                let Ok(events) = result else { return };
                let inner = app_for_watcher.state::<Mutex<WatchRegistry>>();
                let watched: Vec<PathBuf> = inner.lock().unwrap().watched.iter().cloned().collect();
                let mut affected: Vec<PathBuf> = Vec::new();
                for event in events {
                    let path = event.path;
                    for root in &watched {
                        if path.starts_with(root) && !affected.contains(root) {
                            affected.push(root.clone());
                        }
                    }
                }
                for root in affected {
                    emit_repo_changed(&app_for_watcher, root.to_string_lossy().as_ref());
                }
            },
        )
        .map_err(|error| RepoPilotError::Git(format!("Failed to start file watcher: {error}")))?;
        registry.debouncer = Some(debouncer);
    }
    for path in paths {
        let path = PathBuf::from(path);
        if registry.watched.insert(path.clone()) {
            if let Some(debouncer) = registry.debouncer.as_mut() {
                let _ = debouncer.watcher().watch(&path, RecursiveMode::Recursive);
            }
        }
    }
    Ok(true)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(Mutex::new(WatchRegistry {
            debouncer: None,
            watched: HashSet::new(),
        }))
        .invoke_handler(tauri::generate_handler![
            credential_set,
            credential_get,
            credential_delete,
            credential_list_accounts,
            git_open_repository,
            git_worktree_status,
            git_list_branches,
            git_list_commits,
            git_get_commit,
            git_file_diff,
            git_compare_refs,
            git_merge_preview,
            git_sync_log,
            git_run_operation,
            git_run_in_sandbox,
            pick_repository_folder,
            open_external,
            git_watch_paths,
            git_system::git_clone,
            git_system::git_git_version,
            git_graph::git_commit_graph,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
