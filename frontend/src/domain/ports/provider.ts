import type { Account } from "../models/account";
import type { RepoActivityEvent } from "../models/activity";
import type { Branch, BranchComparison } from "../models/branch";
import type { CommitActivityWeek, ContentItem, FileChangeDetail, TreeEntry } from "../models/code";
import type { CommitDetail, CommitSummary } from "../models/commit";
import type { Issue, IssueComment } from "../models/issue";
import type { AppNotification } from "../models/notification";
import type { Organization } from "../models/organization";
import type { PullRequest } from "../models/pull-request";
import type { PullRequestReview } from "../models/review";
import type { Release } from "../models/release";
import type { Contributor, Repository, RepositoryOverview } from "../models/repository";
import type { Tag } from "../models/tag";
import type { CheckRun, WorkflowRun } from "../models/workflow";

/** Result of validating a raw token for a provider. */
export interface TokenValidation {
  readonly account: Account;
  /** Scopes the token was granted, as reported by the provider. */
  readonly scopes: readonly string[];
}

export interface RepositoriesQuery {
  readonly query?: string;
  readonly limit?: number;
}

export interface IssuesQuery {
  readonly state?: "open" | "closed" | "all";
  readonly limit?: number;
}

export interface PullRequestsQuery {
  readonly state?: "open" | "closed" | "all";
  readonly limit?: number;
}

export interface BranchList {
  readonly branches: readonly Branch[];
}

/**
 * Provider-neutral capability port.
 *
 * Feature code depends on this interface only. Provider-specific
 * adapters (GitHub, GitLab, ...) implement it.
 */
export interface Provider {
  readonly id: string;
  readonly displayName: string;

  /** Validate a raw token and return the account it identifies. */
  validateToken(token: string): Promise<TokenValidation>;

  listRepositories(query: RepositoriesQuery): Promise<readonly Repository[]>;
  searchRepositories(query: RepositoriesQuery): Promise<readonly Repository[]>;

  /** Repositories the active account has starred (repo sources). */
  listStarredRepositories(limit?: number): Promise<readonly Repository[]>;
  /** Repositories in one organization, as visible to the token. */
  listOrganizationRepositories(org: string, limit?: number): Promise<readonly Repository[]>;
  /** Repositories the active account can see, ordered by most recent update. */
  listRecentRepositories(limit?: number): Promise<readonly Repository[]>;

  getRepository(fullName: string): Promise<Repository>;
  listBranches(fullName: string): Promise<BranchList>;
  compareBranches(fullName: string, base: string, head: string): Promise<BranchComparison>;
  listCommits(
    fullName: string,
    options?: { branch?: string; limit?: number },
  ): Promise<readonly CommitSummary[]>;
  getCommit(fullName: string, sha: string): Promise<CommitDetail>;

  getLanguages(fullName: string): Promise<ReadonlyMap<string, number>> | null;
  getReadme(fullName: string): Promise<string | null>;
  listContributors(fullName: string, limit?: number): Promise<readonly Contributor[]>;
  getRepositoryOverview(fullName: string): Promise<RepositoryOverview>;

  /** Repository activity feed (pushes, PRs, issues, releases…). */
  listRepositoryActivity(fullName: string, limit?: number): Promise<readonly RepoActivityEvent[]>;

  listPullRequests(fullName: string, query: PullRequestsQuery): Promise<readonly PullRequest[]>;
  getPullRequest(fullName: string, number: number): Promise<PullRequest>;
  listPullRequestCommits(fullName: string, number: number): Promise<readonly CommitSummary[]>;
  listPullRequestFiles(fullName: string, number: number): Promise<readonly FileChangeDetail[]>;
  listPullRequestReviews(fullName: string, number: number): Promise<readonly PullRequestReview[]>;

  /** Create a pull request (provider mutation). */
  createPullRequest(
    fullName: string,
    input: PullRequestCreateInput,
  ): Promise<PullRequest>;
  /** Update title/body/state of a pull request (provider mutation). */
  updatePullRequest(
    fullName: string,
    number: number,
    input: PullRequestUpdateInput,
  ): Promise<PullRequest>;
  /** Merge an open, mergeable pull request (provider mutation). */
  mergePullRequest(
    fullName: string,
    number: number,
    input: PullRequestMergeInput,
  ): Promise<PullRequest>;
  /** Submit a pull request review (provider mutation). */
  submitPullRequestReview(
    fullName: string,
    number: number,
    input: PullRequestReviewInput,
  ): Promise<PullRequestReview>;
  /** Add an issue/PR comment (provider mutation). */
  addIssueComment(fullName: string, number: number, body: string): Promise<IssueComment>;
  /** Update title/body/state of an issue (provider mutation). */
  updateIssue(fullName: string, number: number, input: IssueUpdateInput): Promise<Issue>;

  listIssues(fullName: string, query: IssuesQuery): Promise<readonly Issue[]>;
  getIssue(fullName: string, number: number): Promise<Issue>;
  listIssueComments(fullName: string, number: number): Promise<readonly IssueComment[]>;
  createIssue(
    fullName: string,
    input: { readonly title: string; readonly body?: string },
  ): Promise<Issue>;
  /** Replace the labels attached to an issue or PR (provider mutation). */
  setIssueLabels(fullName: string, number: number, labels: readonly string[]): Promise<Issue["labels"]>;

  listReleases(fullName: string, limit?: number): Promise<readonly Release[]>;
  listTags(fullName: string, limit?: number): Promise<readonly Tag[]>;

  /** Search across repositories (global search). */
  searchCommits(fullName: string, query: string, limit?: number): Promise<readonly CommitSummary[]>;
  searchIssues(fullName: string, query: string, limit?: number): Promise<readonly Issue[]>;
  searchPullRequests(fullName: string, query: string, limit?: number): Promise<readonly PullRequest[]>;

  listNotifications(limit?: number): Promise<readonly AppNotification[]>;

  listWorkflowRuns(fullName: string, limit?: number): Promise<readonly WorkflowRun[]>;
  getCheckRuns(fullName: string, ref: string): Promise<readonly CheckRun[]>;
  getCommitActivity(fullName: string): Promise<readonly CommitActivityWeek[]>;

  getRepositoryTree(fullName: string, branch: string): Promise<readonly TreeEntry[]>;
  getFileContents(fullName: string, path: string, ref?: string): Promise<ContentItem | null>;

  listOrganizations(limit?: number): Promise<readonly Organization[]>;
}


/** Fields an issue update may change. */
export interface IssueUpdateInput {
  readonly title?: string;
  readonly body?: string;
  readonly state?: "open" | "closed";
}

/** Input for creating a pull request through the provider. */
export interface PullRequestCreateInput {
  readonly title: string;
  readonly body?: string;
  readonly base: string;
  readonly head: string;
  readonly draft?: boolean;
}

/** Fields a pull request update may change. */
export interface PullRequestUpdateInput {
  readonly title?: string;
  readonly body?: string;
  readonly state?: "open" | "closed";
}

/** Merge strategy for the merge mutation. */
export interface PullRequestMergeInput {
  readonly method: "merge" | "squash" | "rebase";
}

/** Pull request review submission event. */
export interface PullRequestReviewInput {
  readonly body?: string;
  readonly event: "approve" | "request_changes" | "comment";
}
