//! System `git` integration for network and complex write operations.
//!
//! gix 0.68's transport stack is not even compiled (see the Phase 1.5
//! planning note), so clone/fetch/pull/push and operations gix does not
//! expose cleanly (stash/cherry-pick/revert/rebase/checkout/reset) run the
//! user's installed `git` binary, spawned from Rust with no shell.
//!
//! Auth is injected via `-c credential.helper=` + `-c http.extraHeader=`
//! (Bearer token read from the OS keyring, never from the frontend) and
//! `GIT_TERMINAL_PROMPT=0` so git fails instead of prompting. Progress
//! lines from stderr are streamed to the frontend as `git://progress`
//! events keyed by an operation id.

use serde::{Deserialize, Serialize};
use std::{path::PathBuf, process::Command};
use tauri::Emitter;

use crate::{RepoPilotError, RepoPilotResult};

/// Serializable progress event streamed during a network operation.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GitProgressEvent {
    pub operation_id: String,
    pub phase: String,
    pub percent: Option<u32>,
    pub text: String,
}

/// Structured payload for the `git_clone` command.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GitCloneArgs {
    pub url: String,
    pub target_dir: String,
    pub depth: Option<u32>,
    pub branch: Option<String>,
    pub account_login: Option<String>,
    pub operation_id: String,
}

/// Reported system-git availability for the settings surface.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GitVersion {
    pub version: Option<String>,
}

/// Options for one spawned `git` invocation.
pub(crate) struct GitRunOptions {
    pub cwd: Option<PathBuf>,
    pub args: Vec<String>,
    pub extra_env: Vec<(String, String)>,
    pub auth: Option<GitAuth>,
}

/// A bearer token injected as an HTTP extra header for an HTTPS remote.
pub(crate) struct GitAuth {
    pub token: String,
}

/// Captured stdout/stderr and exit code of a finished git process.
pub(crate) struct GitOutput {
    pub code: i32,
    pub stdout: String,
    pub stderr: String,
}

impl GitOutput {
    pub fn ok(&self) -> bool {
        self.code == 0
    }
}

/// A `git` command with the auth/terminal-prompt environment applied.
fn build_command(opts: &GitRunOptions) -> Command {
    let mut cmd = Command::new("git");
    if let Some(cwd) = &opts.cwd {
        cmd.current_dir(cwd);
    }
    cmd.env("GIT_TERMINAL_PROMPT", "0");
    for (key, value) in &opts.extra_env {
        cmd.env(key, value);
    }
    for arg in &opts.args {
        cmd.arg(arg);
    }
    if let Some(auth) = &opts.auth {
        cmd.arg("-c").arg("credential.helper=");
        cmd.arg("-c").arg(format!(
            "http.extraHeader=Authorization: Bearer {}",
            auth.token
        ));
        cmd.arg("-c").arg("credential.interactive=never");
    }
    cmd.stdin(std::process::Stdio::null());
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());
    cmd
}

/// Run git synchronously, collecting stdout/stderr. No progress events.
pub(crate) fn run_git_sync(opts: &GitRunOptions) -> RepoPilotResult<GitOutput> {
    let mut cmd = build_command(opts);
    let output = cmd
        .output()
        .map_err(|e| RepoPilotError::Git(format!("Failed to start git: {e}")))?;
    Ok(GitOutput {
        code: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

/// Run git while streaming stderr progress lines as `git://progress` events.
///
/// Runs the blocking child on a dedicated thread so the Tauri async executor
/// is never blocked by a long clone/fetch/pull/push.
pub(crate) async fn run_system_git(
    app: &tauri::AppHandle,
    operation_id: &str,
    opts: GitRunOptions,
) -> RepoPilotResult<GitOutput> {
    let app = app.clone();
    let operation_id = operation_id.to_string();
    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = build_command(&opts);
        let mut child = cmd
            .spawn()
            .map_err(|e| RepoPilotError::Git(format!("Failed to start git: {e}")))?;

        let mut stdout = child.stdout.take().expect("stdout piped");
        let mut stderr = child.stderr.take().expect("stderr piped");
        let app_for_stderr = app.clone();
        let op = operation_id.clone();
        let stderr_thread = std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            let reader = BufReader::new(&mut stderr);
            let mut text = String::new();
            for line in reader.lines() {
                let Ok(line) = line else { break };
                if let Some((phase, percent)) = parse_progress(&line) {
                    let _ = app_for_stderr.emit(
                        "git://progress",
                        GitProgressEvent {
                            operation_id: op.clone(),
                            phase,
                            percent,
                            text: line.clone(),
                        },
                    );
                }
                text.push_str(&line);
                text.push('\n');
            }
            text
        });
        let stdout_thread = std::thread::spawn(move || {
            use std::io::Read;
            let mut text = String::new();
            let _ = stdout.read_to_string(&mut text);
            text
        });

        let status = child
            .wait()
            .map_err(|e| RepoPilotError::Git(format!("Failed to wait for git: {e}")))?;
        let stderr_text = stderr_thread
            .join()
            .map_err(|_| RepoPilotError::Git("Failed to join git stderr reader".into()))?;
        let stdout_text = stdout_thread
            .join()
            .map_err(|_| RepoPilotError::Git("Failed to join git stdout reader".into()))?;
        Ok(GitOutput {
            code: status.code().unwrap_or(-1),
            stdout: stdout_text,
            stderr: stderr_text,
        })
    })
    .await
    .map_err(|e| RepoPilotError::Git(format!("git task failed: {e}")))?
}

/// Parse a git progress line into `(phase, percent)`, e.g.
/// `"Receiving objects:  85% (123/145), 42.00 KiB | 1.23 MiB/s"`.
fn parse_progress(line: &str) -> Option<(String, Option<u32>)> {
    let trimmed = line.trim();
    let (phase, rest) = trimmed.split_once(": ")?;
    let phase = phase.trim().to_string();
    if phase.is_empty() {
        return None;
    }
    let percent = rest
        .split('%')
        .next()
        .and_then(|token| token.trim().parse::<u32>().ok());
    Some((phase, percent))
}

/// The last few non-empty lines of a failed git run, for the result message.
pub(crate) fn last_error_message(output: &GitOutput) -> String {
    let text = if output.stderr.trim().is_empty() {
        &output.stdout
    } else {
        &output.stderr
    };
    let meaningful: Vec<&str> = text
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect();
    if meaningful.is_empty() {
        return format!("git exited with code {}", output.code);
    }
    meaningful
        .iter()
        .rev()
        .take(3)
        .rev()
        .cloned()
        .collect::<Vec<_>>()
        .join("\n")
}

fn is_github_https(url: &str) -> bool {
    let lower = url.to_lowercase();
    lower.starts_with("https://") && lower.contains("github.com")
}

/// Resolve a GitHub bearer token for the given account login (or the first
/// stored GitHub account when omitted) from the OS keyring.
pub(crate) fn resolve_token(
    app: &tauri::AppHandle,
    account_login: Option<&str>,
) -> RepoPilotResult<Option<String>> {
    let login = match account_login {
        Some(login) => Some(login.to_string()),
        None => crate::first_github_account(app)?,
    };
    let Some(login) = login else { return Ok(None) };
    let key = crate::credential_key("github", &login);
    let entry = keyring::Entry::new(crate::SERVICE_NAME, &key)?;
    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(error.into()),
    }
}

fn remote_url(repo_path: &str, remote: Option<&str>) -> Option<String> {
    let remote = remote.unwrap_or("origin");
    let output = Command::new("git")
        .current_dir(repo_path)
        .args(["remote", "get-url", remote])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Attach keyring auth for a GitHub HTTPS remote to the options.
fn apply_github_auth(
    app: &tauri::AppHandle,
    opts: &mut GitRunOptions,
    url: &str,
    account_login: Option<&str>,
) -> RepoPilotResult<()> {
    if is_github_https(url) {
        if let Some(token) = resolve_token(app, account_login)? {
            opts.auth = Some(GitAuth { token });
        }
    }
    Ok(())
}

/// `git fetch <remote>` with progress events.
pub(crate) async fn git_fetch(
    app: &tauri::AppHandle,
    operation_id: &str,
    repo_path: &str,
    remote: Option<&str>,
    account_login: Option<&str>,
) -> RepoPilotResult<crate::GitOperationResult> {
    let mut opts = GitRunOptions {
        cwd: Some(PathBuf::from(repo_path)),
        args: vec!["fetch".into()],
        extra_env: Vec::new(),
        auth: None,
    };
    if let Some(remote) = remote {
        opts.args.push(remote.to_string());
    }
    if let Some(url) = remote_url(repo_path, remote) {
        apply_github_auth(app, &mut opts, &url, account_login)?;
    }
    let output = run_system_git(app, operation_id, opts).await?;
    Ok(crate::GitOperationResult {
        ok: output.ok(),
        message: if output.ok() {
            "Fetched from remote".to_string()
        } else {
            last_error_message(&output)
        },
        unsupported: None,
    })
}

/// `git pull [--rebase] <remote> <branch>` with progress events.
#[allow(clippy::too_many_arguments)]
pub(crate) async fn git_pull(
    app: &tauri::AppHandle,
    operation_id: &str,
    repo_path: &str,
    remote: Option<&str>,
    branch: Option<&str>,
    rebase: bool,
    account_login: Option<&str>,
) -> RepoPilotResult<crate::GitOperationResult> {
    let mut opts = GitRunOptions {
        cwd: Some(PathBuf::from(repo_path)),
        args: vec!["pull".into(), "--no-edit".into()],
        extra_env: Vec::new(),
        auth: None,
    };
    if rebase {
        opts.args.push("--rebase".into());
    }
    if let Some(remote) = remote {
        opts.args.push(remote.to_string());
    }
    if let Some(branch) = branch {
        opts.args.push(branch.to_string());
    }
    if let Some(url) = remote_url(repo_path, remote) {
        apply_github_auth(app, &mut opts, &url, account_login)?;
    }
    let output = run_system_git(app, operation_id, opts).await?;
    Ok(crate::GitOperationResult {
        ok: output.ok(),
        message: if output.ok() {
            "Pulled from remote".to_string()
        } else {
            last_error_message(&output)
        },
        unsupported: None,
    })
}

/// `git push [--set-upstream] <remote> <branch>` with progress events.
#[allow(clippy::too_many_arguments)]
pub(crate) async fn git_push(
    app: &tauri::AppHandle,
    operation_id: &str,
    repo_path: &str,
    remote: Option<&str>,
    branch: Option<&str>,
    set_upstream: bool,
    account_login: Option<&str>,
) -> RepoPilotResult<crate::GitOperationResult> {
    let mut opts = GitRunOptions {
        cwd: Some(PathBuf::from(repo_path)),
        args: vec!["push".into()],
        extra_env: Vec::new(),
        auth: None,
    };
    if set_upstream {
        opts.args.push("--set-upstream".into());
    }
    if let Some(remote) = remote {
        opts.args.push(remote.to_string());
    }
    if let Some(branch) = branch {
        opts.args.push(branch.to_string());
    }
    if let Some(url) = remote_url(repo_path, remote) {
        apply_github_auth(app, &mut opts, &url, account_login)?;
    }
    let output = run_system_git(app, operation_id, opts).await?;
    Ok(crate::GitOperationResult {
        ok: output.ok(),
        message: if output.ok() {
            "Pushed to remote".to_string()
        } else {
            last_error_message(&output)
        },
        unsupported: None,
    })
}

/// `git clone [--depth=N] [--branch b] url targetDir` with progress events.
#[tauri::command]
pub(crate) async fn git_clone(
    app: tauri::AppHandle,
    args: GitCloneArgs,
) -> RepoPilotResult<crate::GitOperationResult> {
    if args.url.is_empty() || args.target_dir.is_empty() {
        return Err(RepoPilotError::Git(
            "Clone requires a repository URL and a destination folder.".into(),
        ));
    }
    let target = PathBuf::from(&args.target_dir);
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(RepoPilotError::Io)?;
    }
    if target.exists() {
        let mut entries = std::fs::read_dir(&target).map_err(RepoPilotError::Io)?;
        if entries.next().is_some() {
            return Err(RepoPilotError::Git(format!(
                "Destination '{}' is not empty.",
                args.target_dir
            )));
        }
    }

    let mut opts = GitRunOptions {
        cwd: None,
        args: vec!["clone".into()],
        extra_env: Vec::new(),
        auth: None,
    };
    if let Some(depth) = args.depth {
        opts.args.push(format!("--depth={depth}"));
    }
    if let Some(branch) = &args.branch {
        opts.args.push("--branch".into());
        opts.args.push(branch.clone());
    }
    opts.args.push(args.url.clone());
    opts.args.push(args.target_dir.clone());
    apply_github_auth(&app, &mut opts, &args.url, args.account_login.as_deref())?;

    let output = run_system_git(&app, &args.operation_id, opts).await?;
    if output.ok() {
        crate::emit_repo_changed(&app, &args.target_dir);
    }
    Ok(crate::GitOperationResult {
        ok: output.ok(),
        message: if output.ok() {
            format!("Cloned into {}", args.target_dir)
        } else {
            last_error_message(&output)
        },
        unsupported: None,
    })
}

/// Report the installed git version so the UI can show system-git availability.
#[tauri::command]
pub(crate) async fn git_git_version() -> RepoPilotResult<GitVersion> {
    Ok(GitVersion {
        version: system_git_version(),
    })
}

fn system_git_version() -> Option<String> {
    let output = Command::new("git").arg("--version").output().ok()?;
    if !output.status.success() {
        return None;
    }
    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if version.is_empty() {
        None
    } else {
        Some(version)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_percent_progress() {
        let (phase, percent) =
            parse_progress("Receiving objects:  85% (123/145), 42.00 KiB | 1.23 MiB/s")
                .expect("line parsed");
        assert_eq!(phase, "Receiving objects");
        assert_eq!(percent, Some(85));
    }

    #[test]
    fn parses_phase_without_percent() {
        let (phase, percent) =
            parse_progress("remote: Enumerating objects: 4, done.").expect("line parsed");
        assert_eq!(phase, "remote");
        assert_eq!(percent, None);
    }

    #[test]
    fn ignores_empty_or_no_colon_lines() {
        assert!(parse_progress("").is_none());
        assert!(parse_progress("Cloning into 'x'...").is_none());
        assert!(parse_progress("  ").is_none());
    }

    #[test]
    fn github_https_detection() {
        assert!(is_github_https("https://github.com/octocat/hello.git"));
        assert!(is_github_https("https://GitHub.com/octocat/hello.git"));
        assert!(!is_github_https("git@github.com:octocat/hello.git"));
        assert!(!is_github_https("https://gitlab.com/octocat/hello.git"));
    }

    #[test]
    fn error_message_keeps_tail() {
        let output = GitOutput {
            code: 128,
            stdout: String::new(),
            stderr: "fatal: repository 'x' not found\n\nhint: try again\n".into(),
        };
        assert_eq!(
            last_error_message(&output),
            "fatal: repository 'x' not found\nhint: try again"
        );
    }

    #[test]
    fn empty_remote_is_origin() {
        // remote_url returns None when no git repo exists at the cwd.
        let temp = tempfile::tempdir().expect("tempdir");
        assert!(remote_url(temp.path().to_str().unwrap(), None).is_none());
    }

    #[test]
    fn version_is_some_when_git_present() {
        if Command::new("git")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            assert!(system_git_version().is_some());
        }
    }
}
