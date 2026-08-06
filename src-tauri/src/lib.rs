use gix::{
    bstr::{BStr, ByteSlice},
    open,
    refs::{
        transaction::{Change, PreviousValue, RefLog},
        FullName,
    },
    ObjectId, Repository,
};
use keyring::{Entry, Error as KeyringError};
use serde::{Deserialize, Serialize};
use std::{fs, path::Path, path::PathBuf};
use tauri::Manager;
use tempfile::TempDir;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum GitOSError {
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

impl serde::Serialize for GitOSError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

type GitOSResult<T> = std::result::Result<T, GitOSError>;

/// Map any displayable error into a user-facing GitOSError::Git message.
fn git_err<E: std::fmt::Display>(error: E) -> GitOSError {
    GitOSError::Git(error.to_string())
}

const SERVICE_NAME: &str = "com.git-os.repo_pilot";

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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorktreeStatus {
    repo_path: String,
    current_branch: Option<String>,
    staged: Vec<String>,
    unstaged: Vec<String>,
    untracked: Vec<String>,
    ahead_by: u32,
    behind_by: u32,
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

fn account_index_path(app: &tauri::AppHandle) -> GitOSResult<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| GitOSError::NoAppDataDir)?;
    Ok(dir.join("accounts.json"))
}

fn read_account_index(app: &tauri::AppHandle) -> GitOSResult<Vec<String>> {
    let path = account_index_path(app)?;
    match fs::read_to_string(&path) {
        Ok(raw) => serde_json::from_str(&raw).map_err(|e| GitOSError::Git(e.to_string())),
        Err(_) => Ok(Vec::new()),
    }
}

fn write_account_index(app: &tauri::AppHandle, keys: &[String]) -> GitOSResult<()> {
    let path = account_index_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let raw = serde_json::to_string_pretty(keys).map_err(|e| GitOSError::Git(e.to_string()))?;
    fs::write(&path, raw)?;
    Ok(())
}

#[tauri::command]
async fn credential_set(app: tauri::AppHandle, args: CredentialSetArgs) -> GitOSResult<bool> {
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
async fn credential_get(args: CredentialGetArgs) -> GitOSResult<Option<String>> {
    let key = credential_key(&args.provider_id, &args.account_login);
    let entry = Entry::new(SERVICE_NAME, &key)?;
    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

#[tauri::command]
async fn credential_delete(app: tauri::AppHandle, args: CredentialDeleteArgs) -> GitOSResult<()> {
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
) -> GitOSResult<Vec<String>> {
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

// ---------------------------------------------------------------------------
// Local Git commands (gitoxide).
// ---------------------------------------------------------------------------

fn open_repo(path: &str) -> GitOSResult<Repository> {
    open(path).map_err(git_err)
}

fn worktree_root(repo: &Repository) -> PathBuf {
    repo.worktree()
        .map(|worktree| worktree.base().to_path_buf())
        .unwrap_or_else(|| repo.path().to_path_buf())
}

/// Build the tree object id representing the current index contents.
fn tree_id_from_index(repo: &Repository) -> GitOSResult<ObjectId> {
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
fn count_reachable(repo: &Repository, tip: ObjectId, exclude: ObjectId) -> GitOSResult<u32> {
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

fn get_worktree_status(repo: &Repository) -> GitOSResult<WorktreeStatus> {
    let head_name = repo.head_name().ok().flatten().map(|name| name.to_string());

    let mut staged: Vec<String> = Vec::new();
    if let Ok(head_commit) = repo.head_commit() {
        let head_tree = head_commit.tree().map_err(git_err)?;
        let index_tree_id = tree_id_from_index(repo)?;
        let index_tree = repo.find_tree(index_tree_id).map_err(git_err)?;
        let changes = repo
            .diff_tree_to_tree(Some(&head_tree), Some(&index_tree), None)
            .map_err(git_err)?;
        for change in changes {
            staged.push(String::from_utf8_lossy(change.location().as_ref()).to_string());
        }
    }

    let mut unstaged: Vec<String> = Vec::new();
    let mut untracked: Vec<String> = Vec::new();
    let status = repo
        .status(gix::progress::Discard)
        .map_err(git_err)?
        .index_worktree_rewrites(None)
        .into_index_worktree_iter(Vec::<gix::bstr::BString>::new())
        .map_err(git_err)?;
    for item in status {
        let item = item.map_err(git_err)?;
        match item {
            gix::status::index_worktree::iter::Item::Modification { rela_path, .. } => {
                unstaged.push(String::from_utf8_lossy(rela_path.as_ref()).to_string());
            }
            gix::status::index_worktree::iter::Item::DirectoryContents { entry, .. } => {
                if matches!(entry.status, gix::dir::entry::Status::Untracked) {
                    untracked.push(String::from_utf8_lossy(entry.rela_path.as_ref()).to_string());
                }
            }
            gix::status::index_worktree::iter::Item::Rewrite { .. } => {}
        }
    }

    let (ahead_by, behind_by) = match &head_name {
        Some(name) => {
            let upstream = format!("refs/remotes/origin/{}", name);
            repo.find_reference(&upstream)
                .map_err(git_err)
                .and_then(|mut reference| {
                    let head_id = repo.head_commit().map_err(git_err)?.id().detach();
                    let upstream_id = reference.peel_to_id_in_place().map_err(git_err)?.detach();
                    let ahead = count_reachable(repo, head_id, upstream_id)?;
                    let behind = count_reachable(repo, upstream_id, head_id)?;
                    Ok((ahead, behind))
                })
                .unwrap_or_default()
        }
        None => (0, 0),
    };

    Ok(WorktreeStatus {
        repo_path: worktree_root(repo).to_string_lossy().to_string(),
        current_branch: head_name,
        staged,
        unstaged,
        untracked,
        ahead_by,
        behind_by,
    })
}

#[tauri::command]
async fn git_open_repository(args: GitOpenRepoArgs) -> GitOSResult<Option<WorktreeStatus>> {
    match open_repo(&args.path) {
        Ok(repo) => get_worktree_status(&repo).map(Some),
        Err(GitOSError::Git(_)) => Ok(None),
        Err(e) => Err(e),
    }
}

#[tauri::command]
async fn git_worktree_status(args: GitWorktreeStatusArgs) -> GitOSResult<Option<WorktreeStatus>> {
    match open_repo(&args.path) {
        Ok(repo) => get_worktree_status(&repo).map(Some),
        Err(GitOSError::Git(_)) => Ok(None),
        Err(e) => Err(e),
    }
}

fn commit_to_summary(commit: &gix::Commit<'_>) -> GitOSResult<CommitSummary> {
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
    })
}

fn commit_to_detail(repo: &Repository, commit: &gix::Commit<'_>) -> GitOSResult<CommitDetail> {
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

fn branch_to_model(repo: &Repository, name: &str) -> GitOSResult<Branch> {
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
async fn git_list_branches(args: GitListBranchesArgs) -> GitOSResult<Vec<Branch>> {
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
async fn git_list_commits(args: GitListCommitsArgs) -> GitOSResult<Vec<CommitSummary>> {
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
async fn git_get_commit(args: GitGetCommitArgs) -> GitOSResult<CommitDetail> {
    let repo = open_repo(&args.path)?;
    let object_id = ObjectId::from_hex(args.sha.as_bytes()).map_err(git_err)?;
    let commit = repo.find_commit(object_id).map_err(git_err)?;
    commit_to_detail(&repo, &commit)
}

fn fallback_signature() -> gix::actor::Signature {
    gix::actor::Signature {
        name: "GitOS User".into(),
        email: "user@git-os.local".into(),
        time: gix::date::Time::now_local_or_utc(),
    }
}

/// Use the repository's configured identity when present, otherwise a
/// clearly-labelled GitOS fallback identity.
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
fn stage_path(repo: &Repository, root: &Path, relative: &str) -> GitOSResult<()> {
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

fn commit_message(repo: &Repository, message: &str) -> GitOSResult<ObjectId> {
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

#[tauri::command]
async fn git_run_operation(args: GitRunOperationArgs) -> GitOSResult<GitOperationResult> {
    let repo = open_repo(&args.repo_path)?;
    let root = worktree_root(&repo);

    let result = match args.operation.as_str() {
        "stage" => {
            let paths = args
                .payload
                .get("paths")
                .and_then(|value| value.as_array())
                .ok_or_else(|| GitOSError::Git("Missing paths".into()))?;
            for path in paths {
                let Some(path) = path.as_str() else { continue };
                stage_path(&repo, &root, path)?;
            }
            Ok(GitOperationResult { ok: true, message: "Files staged".into(), unsupported: None })
        }
        "unstage" => {
            let paths = args
                .payload
                .get("paths")
                .and_then(|value| value.as_array())
                .ok_or_else(|| GitOSError::Git("Missing paths".into()))?;
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
            Ok(GitOperationResult { ok: true, message: "Files unstaged".into(), unsupported: None })
        }
        "commit" => {
            let message = args
                .payload
                .get("message")
                .and_then(|value| value.as_str())
                .ok_or_else(|| GitOSError::Git("Missing message".into()))?;
            let id = commit_message(&repo, message)?;
            Ok(GitOperationResult { ok: true, message: format!("Committed {}", &id.to_hex().to_string()[..7]), unsupported: None })
        }
        "create-branch" => {
            let branch = args
                .payload
                .get("branch")
                .and_then(|value| value.as_str())
                .ok_or_else(|| GitOSError::Git("Missing branch".into()))?;
            let ref_name = format!("refs/heads/{}", branch);
            let head_id = repo.head_commit().map_err(git_err)?.id().detach();
            repo.reference(
                ref_name,
                head_id,
                gix::refs::transaction::PreviousValue::MustNotExist,
                gix::bstr::BString::from("create-branch"),
            )
            .map_err(git_err)?;
            Ok(GitOperationResult { ok: true, message: format!("Created branch {}", branch), unsupported: None })
        }
        "delete-branch" => {
            let branch = args
                .payload
                .get("branch")
                .and_then(|value| value.as_str())
                .ok_or_else(|| GitOSError::Git("Missing branch".into()))?;
            let ref_name = format!("refs/heads/{}", branch);
            let full_name = FullName::try_from(ref_name).map_err(|_| GitOSError::InvalidRef(branch.into()))?;
            repo.edit_reference(gix::refs::transaction::RefEdit {
                change: Change::Delete {
                    expected: PreviousValue::Any,
                    log: RefLog::AndReference,
                },
                name: full_name,
                deref: false,
            })
            .map_err(git_err)?;
            Ok(GitOperationResult { ok: true, message: format!("Deleted branch {}", branch), unsupported: None })
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

    result
}

#[tauri::command]
async fn git_run_in_sandbox(args: GitRunInSandboxArgs) -> GitOSResult<GitOperationResult> {
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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
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
            git_run_operation,
            git_run_in_sandbox,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
