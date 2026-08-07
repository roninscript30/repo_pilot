import type { Account } from "@/domain/models/account";
import type { Branch } from "@/domain/models/branch";
import type { CommitActivityWeek, ContentItem, FileChangeDetail, TreeEntry } from "@/domain/models/code";
import { shortSha } from "@/domain/models/commit";
import type { CommitSummary } from "@/domain/models/commit";
import type { Issue, IssueComment } from "@/domain/models/issue";
import type { AppNotification } from "@/domain/models/notification";
import type { Organization } from "@/domain/models/organization";
import type { PullRequest, PullRequestState } from "@/domain/models/pull-request";
import type { Release, ReleaseAsset } from "@/domain/models/release";
import { isPinnedRepository } from "@/features/repositories/services/repository-pins";
import type { Contributor, Repository, RepositoryOwner } from "@/domain/models/repository";
import type { PullRequestReview, PullRequestReviewState } from "@/domain/models/review";
import type { Tag } from "@/domain/models/tag";
import type { CheckRun, WorkflowRun, WorkflowRunConclusion, WorkflowRunStatus } from "@/domain/models/workflow";
import type {
  GitHubBranch,
  GitHubCheckRun,
  GitHubComment,
  GitHubCommit,
  GitHubCommitActivityWeek,
  GitHubContentItem,
  GitHubIssue,
  GitHubNotification,
  GitHubOrganization,
  GitHubPullRequest,
  GitHubPullRequestFile,
  GitHubRelease,
  GitHubRepository,
  GitHubReview,
  GitHubTag,
  GitHubTreeEntry,
  GitHubUser,
  GitHubWorkflowRun,
} from "./types";

const GITHUB_PROVIDER_ID = "github";

export function mapOwner(user: GitHubUser): RepositoryOwner {
  return {
    login: user.login,
    avatarUrl: user.avatar_url,
  };
}

export function mapAccount(user: GitHubUser, scopes: readonly string[]): Account {
  return {
    providerId: GITHUB_PROVIDER_ID,
    login: user.login,
    displayName: user.name ?? user.login,
    avatarUrl: user.avatar_url,
    scopes,
    createdAt: new Date().toISOString(),
  };
}

export function mapRepository(repo: GitHubRepository): Repository {
  return {
    id: String(repo.id),
    providerId: GITHUB_PROVIDER_ID,
    fullName: repo.full_name,
    owner: mapOwner(repo.owner),
    name: repo.name,
    description: repo.description,
    url: repo.html_url,
    isPrivate: repo.private,
    isPinned: isPinnedRepository(repo.full_name),
    defaultBranch: repo.default_branch,
    language: repo.language,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    watchers: repo.watchers_count,
    openIssues: repo.open_issues_count,
    openPullRequests: null,
    ownerType: repo.owner.type === "Organization" ? "organization" : repo.owner.type === "User" ? "user" : "unknown",
    branches: null,
  };
}

export function mapBranch(branch: GitHubBranch): Branch {
  const commit = branch.commit;
  return {
    name: branch.name,
    isProtected: branch.protected,
    latestCommit: commit
      ? {
          sha: commit.sha,
          subject: "",
          message: "",
          shortSha: shortSha(commit.sha),
          committedAt: "",
          author: { name: "", email: "", login: null, avatarUrl: null },
          parents: [],
        }
      : null,
  };
}

export function mapCommit(raw: GitHubCommit): CommitSummary {
  const commitData = raw.commit;
  const authorData = commitData.author;
  const user = raw.author;
  return {
    sha: raw.sha,
    shortSha: shortSha(raw.sha),
    message: commitData.message,
    subject: commitData.message.split("\n")[0] ?? "",
    author: {
      name: authorData?.name ?? user?.login ?? "unknown",
      email: authorData?.email ?? "",
      login: user?.login ?? null,
      avatarUrl: user?.avatar_url ?? null,
    },
    committedAt: authorData?.date ?? "",
    parents: (raw.parents ?? []).map((parent) => parent.sha),
  };
}

export function mapIssue(raw: GitHubIssue): Issue {
  return {
    id: String(raw.id),
    number: raw.number,
    title: raw.title,
    body: raw.body,
    state: raw.state,
    url: raw.html_url,
    author: { login: raw.user.login, avatarUrl: raw.user.avatar_url },
    assignees: (raw.assignees ?? []).map((u) => ({ login: u.login, avatarUrl: u.avatar_url })),
    labels: (raw.labels ?? []).map((l) => ({ name: l.name, color: l.color })),
    milestone: raw.milestone
      ? { title: raw.milestone.title, state: raw.milestone.state, dueOn: raw.milestone.due_on }
      : null,
    comments: null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    closedAt: raw.closed_at,
  };
}

export function mapPullRequest(raw: GitHubPullRequest): PullRequest {
  let state: PullRequestState = raw.state;
  if (raw.state === "closed" && raw.merged_at !== null) {
    state = "merged";
  }
  let reviewDecision: PullRequest["reviewDecision"] = "none";
  let reviewStateUnknown = true;
  if (raw.review_decision === "approved") {
    reviewDecision = "approved";
    reviewStateUnknown = false;
  } else if (raw.review_decision === "changes_requested") {
    reviewDecision = "changes_requested";
    reviewStateUnknown = false;
  } else if (raw.review_decision === "review_required") {
    reviewDecision = "review_required";
    reviewStateUnknown = false;
  } else if (raw.review_decision === "needs_review" || raw.review_decision === "requested_changes") {
    reviewDecision = raw.review_decision === "requested_changes" ? "changes_requested" : "review_required";
    reviewStateUnknown = false;
  }
  return {
    id: String(raw.id),
    number: raw.number,
    title: raw.title,
    body: raw.body,
    state,
    url: raw.html_url,
    isDraft: raw.draft,
    isMerged: raw.merged_at !== null,
    baseBranch: raw.base.ref,
    headBranch: raw.head.ref,
    author: { login: raw.user.login, avatarUrl: raw.user.avatar_url },
    mergedAt: raw.merged_at,
    closedAt: raw.closed_at,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    additions: raw.additions ?? null,
    deletions: raw.deletions ?? null,
    changedFiles: raw.changed_files ?? null,
    reviewDecision,
    commits: null,
    mergeable: raw.mergeable ?? null,
    reviewStateUnknown,
  };
}

export function mapRelease(raw: GitHubRelease): Release {
  return {
    id: String(raw.id),
    tagName: raw.tag_name,
    name: raw.name,
    body: raw.body,
    url: raw.html_url,
    isDraft: raw.draft,
    isPrerelease: raw.prerelease,
    author: { login: raw.author.login, avatarUrl: raw.author.avatar_url },
    publishedAt: raw.published_at,
    createdAt: raw.created_at,
    assets: (raw.assets ?? []).map(mapReleaseAsset),
  };
}

export function mapComment(raw: GitHubComment): IssueComment {
  return {
    id: String(raw.id),
    body: raw.body,
    author: { login: raw.user.login, avatarUrl: raw.user.avatar_url },
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function mapReview(raw: GitHubReview): PullRequestReview {
  const rawState = raw.state.toLowerCase();
  let state: PullRequestReviewState = "other";
  if (rawState === "approved") state = "approved";
  else if (rawState === "changes_requested") state = "changes_requested";
  else if (rawState === "commented") state = "commented";
  else if (rawState === "dismissed") state = "dismissed";
  else if (rawState === "pending") state = "pending";
  return {
    id: String(raw.id),
    author: { login: raw.user.login, avatarUrl: raw.user.avatar_url },
    state,
    body: raw.body,
    submittedAt: raw.submitted_at,
  };
}

export function mapPullRequestFile(raw: GitHubPullRequestFile): FileChangeDetail {
  return {
    filename: raw.filename,
    status: raw.status as FileChangeDetail["status"],
    additions: raw.additions,
    deletions: raw.deletions,
    changes: raw.changes,
    patch: raw.patch ?? null,
  };
}

export function mapNotification(raw: GitHubNotification): AppNotification {
  return {
    id: raw.id,
    isUnread: raw.unread,
    reason: raw.reason,
    subjectTitle: raw.subject.title,
    subjectType: raw.subject.type,
    url: raw.subject.url,
    repositoryFullName: raw.repository.full_name,
    updatedAt: raw.updated_at,
  };
}

export function mapWorkflowRun(raw: GitHubWorkflowRun): WorkflowRun {
  const status: WorkflowRunStatus =
    raw.status === "queued" || raw.status === "in_progress" || raw.status === "completed"
      ? raw.status
      : "unknown";
  let conclusion: WorkflowRunConclusion = null;
  if (raw.conclusion === "success" || raw.conclusion === "failure" || raw.conclusion === "cancelled" || raw.conclusion === "skipped" || raw.conclusion === "neutral") {
    conclusion = raw.conclusion;
  }
  return {
    id: String(raw.id),
    name: raw.name ?? "Workflow",
    displayTitle: raw.display_title ?? raw.name ?? "Workflow",
    headBranch: raw.head_branch,
    headSha: raw.head_sha,
    runNumber: raw.run_number,
    status,
    conclusion,
    url: raw.html_url,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function mapCheckRun(raw: GitHubCheckRun): CheckRun {
  return {
    id: String(raw.id),
    name: raw.name,
    status: raw.status,
    conclusion: raw.conclusion,
  };
}

export function mapOrganization(raw: GitHubOrganization): Organization {
  return {
    login: raw.login,
    avatarUrl: raw.avatar_url,
    description: raw.description,
  };
}

export function mapTag(raw: GitHubTag): Tag {
  return {
    name: raw.name,
    commitSha: raw.commit.sha,
  };
}

export function mapCommitActivity(raw: GitHubCommitActivityWeek): CommitActivityWeek {
  return {
    week: raw.week,
    total: raw.total,
    days: raw.days,
  };
}

export function mapTreeEntry(raw: GitHubTreeEntry): TreeEntry {
  return {
    path: raw.path,
    type: raw.type,
    size: raw.size ?? null,
    sha: raw.sha,
  };
}

export function mapContentItem(raw: GitHubContentItem): ContentItem {
  return {
    type: raw.type === "file" ? "file" : raw.type === "dir" ? "dir" : "submodule",
    name: raw.name,
    path: raw.path,
    size: raw.size,
    content: raw.content ?? null,
    downloadUrl: raw.download_url,
  };
}

export function mapReleaseAsset(asset: NonNullable<GitHubRelease["assets"]>[number]): ReleaseAsset {
  return {
    name: asset.name,
    size: asset.size,
    downloadCount: asset.download_count,
    downloadUrl: asset.browser_download_url,
  };
}

export function mapContributor(raw: GitHubUser): Contributor {
  return {
    login: raw.login,
    avatarUrl: raw.avatar_url,
    contributions: 0,
  };
}
