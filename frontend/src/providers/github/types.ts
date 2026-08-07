/** Raw GitHub REST response shapes (subset used by Repo Pilot). */

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string | null;
  name: string | null;
  html_url: string;
  type?: "User" | "Organization" | string;
}

export interface GitHubRepository {
  id: number;
  full_name: string;
  owner: GitHubUser;
  name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  default_branch: string | null;
  language: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  archived: boolean;
  fork: boolean;
}

export interface GitHubBranch {
  name: string;
  protected: boolean;
  commit?: {
    sha: string;
    html_url: string;
  };
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    } | null;
    committer: {
      name: string;
      email: string;
      date: string;
    } | null;
    message: string;
  };
  author: GitHubUser | null;
  html_url: string;
  parents?: { sha: string }[];
}

export interface GitHubCommitDetail extends GitHubCommit {
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }[];
  parents: { sha: string }[];
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  user: GitHubUser;
  assignees?: GitHubUser[];
  labels?: { name: string; color: string }[];
  milestone?: { title: string; state: "open" | "closed"; due_on: string | null } | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  pull_request?: { url: string };
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  draft: boolean;
  merged_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  base: { ref: string };
  head: { ref: string };
  user: GitHubUser;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  mergeable?: boolean | null;
  requested_reviewers?: GitHubUser[];
  review_decision?: string | null;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  author: GitHubUser;
  published_at: string | null;
  created_at: string;
  assets?: {
    name: string;
    size: number;
    download_count: number;
    browser_download_url: string;
  }[];
}

export interface GitHubLanguages {
  [language: string]: number;
}

export interface GitHubContent {
  content: string;
  encoding: string;
}

/** /repos/{fullName}/git/trees/{sha}?recursive=1 */
export interface GitHubTree {
  sha: string;
  truncated: boolean;
  tree: GitHubTreeEntry[];
}

export interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  size?: number;
  sha: string;
  url?: string;
}

/** /repos/{fullName}/contents/{path} */
export interface GitHubContentItem {
  type: "file" | "dir" | "submodule";
  encoding?: string;
  size: number;
  name: string;
  path: string;
  content?: string;
  download_url: string | null;
}

/** /notifications */
export interface GitHubNotification {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  last_read_at: string | null;
  subject: {
    title: string;
    url: string;
    type: string;
  };
  repository: GitHubRepository;
}

/** /repos/{fullName}/actions/runs */
export interface GitHubWorkflowRun {
  id: number;
  name: string | null;
  head_branch: string;
  head_sha: string;
  run_number: number;
  status: "queued" | "in_progress" | "completed" | string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  display_title: string | null;
}

/** /repos/{fullName}/commits/{ref}/check-runs */
export interface GitHubCheckRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
}

/** /repos/{fullName}/issues/{n}/comments */
export interface GitHubComment {
  id: number;
  body: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
}

/** /repos/{fullName}/pulls/{n}/reviews */
export interface GitHubReview {
  id: number;
  user: GitHubUser;
  state: string;
  body: string | null;
  submitted_at: string | null;
}

/** /repos/{fullName}/pulls/{n}/files */
export interface GitHubPullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  blob_url?: string;
}

/** /user/orgs */
export interface GitHubOrganization {
  login: string;
  avatar_url: string | null;
  description: string | null;
}

/** /repos/{fullName}/tags */
export interface GitHubTag {
  name: string;
  commit: { sha: string };
}

/** /repos/{fullName}/stats/commit_activity */
export interface GitHubCommitActivityWeek {
  week: number;
  total: number;
  days: number[];
}

/** /search/commits */
export interface GitHubSearchCommits {
  items?: GitHubCommit[];
}

/** /search/issues */
export interface GitHubSearchIssues {
  items?: (GitHubIssue | GitHubPullRequest)[];
}

/** /repos/{fullName}/issues POST body result */
export type GitHubCreatedIssue = GitHubIssue;

