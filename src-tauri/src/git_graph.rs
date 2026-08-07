//! Full commit-DAG command surface for the interactive branch graph.
//!
//! `git_commit_graph` walks every commit reachable from any ref
//! (local branches, remote-tracking branches, tags, HEAD) and returns the
//! full graph with parent ids, per-commit ref decorations, author/time, and
//! merge flags. The frontend lays lanes from `parents` (ADR: commit-graph
//! command surface).

use gix::bstr::ByteSlice;
use gix::ObjectId;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

use crate::{git_err, open_repo, RepoPilotResult};

/// One commit in the returned DAG.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GraphNode {
    pub id: String,
    pub parents: Vec<String>,
    pub refs: Vec<GraphRef>,
    pub subject: String,
    pub author_name: String,
    pub author_email: String,
    pub time: i64,
    pub is_merge: bool,
}

/// A ref decorating a commit (branch / remote / tag / HEAD marker).
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GraphRef {
    pub name: String,
    pub kind: String,
}

/// The full commit graph of a repository.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CommitGraph {
    pub head_ref: Option<String>,
    pub nodes: Vec<GraphNode>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GitCommitGraphArgs {
    pub path: String,
    pub limit: Option<usize>,
}

/// Resolve the (short) ref name for a full ref name.
fn display_name(full_name: &str, kind: &str) -> String {
    let prefix = match kind {
        "branch" => "refs/heads/",
        "remote" => "refs/remotes/",
        "tag" => "refs/tags/",
        _ => "",
    };
    full_name
        .strip_prefix(prefix)
        .unwrap_or(full_name)
        .to_string()
}

/// `commit id -> refs pointing at it`.
type RefMap = HashMap<ObjectId, Vec<GraphRef>>;

/// Collect tips and per-commit ref decorations from all visible refs.
fn collect_refs(repo: &gix::Repository) -> RepoPilotResult<(Vec<ObjectId>, RefMap)> {
    let mut tips: Vec<ObjectId> = Vec::new();
    let mut refs_by_id: HashMap<ObjectId, Vec<GraphRef>> = HashMap::new();

    for reference in repo.references().map_err(git_err)?.all().map_err(git_err)? {
        let reference = reference.map_err(git_err)?;
        let name = reference.name().as_bstr().to_str_lossy().to_string();
        let kind = if name.starts_with("refs/heads/") {
            "branch"
        } else if name.starts_with("refs/remotes/") {
            "remote"
        } else if name.starts_with("refs/tags/") {
            "tag"
        } else {
            continue;
        };
        let mut reference = reference;
        let Ok(peeled) = reference.peel_to_id_in_place() else {
            continue;
        };
        let target = peeled.detach();
        if repo.find_commit(target).is_err() {
            continue;
        }
        tips.push(target);
        refs_by_id.entry(target).or_default().push(GraphRef {
            name: display_name(&name, kind),
            kind: kind.to_string(),
        });
    }

    // HEAD decoration (the current branch marker, distinct from the ref itself).
    if let Ok(head_id) = repo.head_id() {
        let head_id = head_id.detach();
        if repo.find_commit(head_id).is_ok() {
            tips.push(head_id);
            refs_by_id.entry(head_id).or_default().push(GraphRef {
                name: "HEAD".to_string(),
                kind: "head".to_string(),
            });
        }
    }

    Ok((tips, refs_by_id))
}

/// Build the full commit DAG reachable from all refs.
#[tauri::command]
pub(crate) async fn git_commit_graph(args: GitCommitGraphArgs) -> RepoPilotResult<CommitGraph> {
    let repo = open_repo(&args.path)?;
    let head_ref = repo
        .head_name()
        .ok()
        .flatten()
        .map(|name| name.shorten().to_str_lossy().to_string());

    let (tips, mut refs_by_id) = collect_refs(&repo)?;
    let limit = args.limit.unwrap_or(2000);

    let mut seen: HashSet<ObjectId> = HashSet::new();
    let mut nodes: Vec<GraphNode> = Vec::new();

    for item in repo.rev_walk(tips).all().map_err(git_err)? {
        let info = item.map_err(git_err)?;
        if !seen.insert(info.id) {
            continue;
        }
        let commit = repo.find_commit(info.id).map_err(git_err)?;
        let author = commit.author().map_err(git_err)?;
        let parents: Vec<String> = commit
            .parent_ids()
            .map(|parent| parent.to_hex().to_string())
            .collect();
        let message = commit
            .message_raw()
            .map_err(git_err)?
            .to_str_lossy()
            .to_string();
        let subject = message.lines().next().unwrap_or("").to_string();
        let refs = refs_by_id.remove(&info.id).unwrap_or_default();
        nodes.push(GraphNode {
            id: info.id.to_hex().to_string(),
            parents,
            refs,
            subject,
            author_name: author.name.to_str_lossy().to_string(),
            author_email: author.email.to_str_lossy().to_string(),
            time: author.time.seconds,
            is_merge: false,
        });
        if nodes.len() >= limit {
            break;
        }
    }

    // Recompute merge flags after collecting (parents known at push time).
    for node in &mut nodes {
        node.is_merge = node.parents.len() > 1;
    }

    Ok(CommitGraph { head_ref, nodes })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Build a linear-history fixture with system git. Returns false when git
    /// is not available so the test can skip.
    fn init_commits(path: &std::path::Path, messages: &[&str]) -> bool {
        let run = |args: &[&str]| {
            std::process::Command::new("git")
                .args(args)
                .current_dir(path)
                .status()
                .map(|status| status.success())
                .unwrap_or(false)
        };
        if !run(&["init", "-q"]) {
            return false;
        }
        if !run(&["config", "user.email", "test@example.com"])
            || !run(&["config", "user.name", "Test"])
        {
            return false;
        }
        for (index, message) in messages.iter().enumerate() {
            std::fs::write(
                path.join(format!("file{index}.txt")),
                format!("content {index}\n"),
            )
            .expect("write file");
            if !run(&["add", "-A"]) || !run(&["commit", "-q", "-m", message]) {
                return false;
            }
        }
        true
    }

    #[test]
    fn graph_walks_linear_history() {
        let temp = tempfile::tempdir().expect("tempdir");
        if !init_commits(temp.path(), &["one", "two", "three"]) {
            eprintln!("skipping: git not available");
            return;
        }
        let repo = open_repo(temp.path().to_str().unwrap()).expect("open");
        let (tips, refs) = collect_refs(&repo).expect("refs");
        let mut seen = HashSet::new();
        let mut nodes = Vec::new();
        for item in repo.rev_walk(tips).all().unwrap() {
            let info = item.unwrap();
            if !seen.insert(info.id) {
                continue;
            }
            let commit = repo.find_commit(info.id).unwrap();
            let author = commit.author().unwrap();
            nodes.push(GraphNode {
                id: info.id.to_hex().to_string(),
                parents: commit
                    .parent_ids()
                    .map(|p| p.to_hex().to_string())
                    .collect(),
                refs: refs.get(&info.id).cloned().unwrap_or_default(),
                subject: commit.message_raw().unwrap().to_str_lossy().to_string(),
                author_name: author.name.to_str_lossy().to_string(),
                author_email: author.email.to_str_lossy().to_string(),
                time: author.time.seconds,
                is_merge: commit.parent_ids().count() > 1,
            });
        }
        assert_eq!(nodes.len(), 3);
        // newest first
        assert_eq!(nodes[0].parents.len(), 1);
        assert_eq!(nodes[2].parents.len(), 0);
        // a local branch ref decorates the newest commit
        assert!(nodes[0]
            .refs
            .iter()
            .any(|graph_ref| graph_ref.kind == "branch"));
    }
}
