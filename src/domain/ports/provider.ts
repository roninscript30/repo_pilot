import type { Account } from "../models/account";
import type { Branch, BranchComparison } from "../models/branch";
import type { CommitActivityWeek, ContentItem, FileChangeDetail, TreeEntry } from "../models/code";
import type { CommitDetail, CommitSummary } from "../models/commit";
import type { Issue, IssueComment } from "../models/issue";
import type { AppNotification } from "../models/notification";
import type { Organization } from "../models/organization";
import type { PullRequest } from "../models/pull-request";
import type { Release } from "../models/release";
import type { Contributor, Repository, RepositoryOverview } from "../models/repository";
import type { PullRequestReview } from "../models/review";
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

  listPullRequests(fullName: string, query: PullRequestsQuery): Promise<readonly PullRequest[]>;
  getPullRequest(fullName: string, number: number): Promise<PullRequest>;
  listPullRequestCommits(fullName: string, number: number): Promise<readonly CommitSummary[]>;
  listPullRequestFiles(fullName: string, number: number): Promise<readonly FileChangeDetail[]>;
  listPullRequestReviews(fullName: string, number: number): Promise<readonly PullRequestReview[]>;

  listIssues(fullName: string, query: IssuesQuery): Promise<readonly Issue[]>;
  getIssue(fullName: string, number: number): Promise<Issue>;
  listIssueComments(fullName: string, number: number): Promise<readonly IssueComment[]>;
  createIssue(
    fullName: string,
    input: { readonly title: string; readonly body?: string },
  ): Promise<Issue>;

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
