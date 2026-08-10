import type {
  BranchList,
  IssueUpdateInput,
  IssuesQuery,
  Provider,
  PullRequestCreateInput,
  PullRequestMergeInput,
  PullRequestReviewInput,
  PullRequestUpdateInput,
  PullRequestsQuery,
  RepositoriesQuery,
  TokenValidation,
} from "@/domain/ports/provider";
import type { RepoActivityEvent } from "@/domain/models/activity";
import type { BranchComparison } from "@/domain/models/branch";
import { type CommitDetail, type CommitSummary } from "@/domain/models/commit";
import type { Issue, IssueComment } from "@/domain/models/issue";
import type { AppNotification } from "@/domain/models/notification";
import type { Organization } from "@/domain/models/organization";
import type { PullRequest } from "@/domain/models/pull-request";
import type { Release } from "@/domain/models/release";
import type { Contributor, Repository, RepositoryOverview } from "@/domain/models/repository";
import type { PullRequestReview } from "@/domain/models/review";
import type { Tag } from "@/domain/models/tag";
import type { CheckRun, WorkflowRun } from "@/domain/models/workflow";
import { perPage } from "./api";
import { GitHubApiError } from "./api";
import type { GitHubApiClient } from "./api";
import {
  mapAccount,
  mapActivityEvent,
  mapBranch,
  mapCheckRun,
  mapCommit,
  mapComment,
  mapCommitActivity,
  mapContentItem,
  mapContributor,
  mapIssue,
  mapNotification,
  mapOrganization,
  mapPullRequest,
  mapPullRequestFile,
  mapRelease,
  mapRepository,
  mapReview,
  mapTag,
  mapTreeEntry,
  mapWorkflowRun,
} from "./mappers";
import type {
  GitHubActivityEvent,
  GitHubBranch,
  GitHubCheckRun,
  GitHubComment,
  GitHubCommit,
  GitHubCommitActivityWeek,
  GitHubContent,
  GitHubContentItem,
  GitHubIssue,
  GitHubLanguages,
  GitHubNotification,
  GitHubOrganization,
  GitHubPullRequest,
  GitHubPullRequestFile,
  GitHubRelease,
  GitHubRepository,
  GitHubReview,
  GitHubSearchCommits,
  GitHubSearchIssues,
  GitHubTag,
  GitHubTree,
  GitHubUser,
  GitHubWorkflowRun,
} from "./types";

const README_CANDIDATES = ["README.md", "README", "readme.md", "Readme.md"] as const;
const SCOPE_HEADER = "x-oauth-scopes";

interface Page {
  readonly scopes: readonly string[];
}

/** GitHub adapter implementing the provider-neutral Provider port (ADR-0004). */
export class GitHubProvider implements Provider {
  readonly id = "github";
  readonly displayName = "GitHub";

  constructor(private readonly client: GitHubApiClient) {}

  async validateToken(token: string): Promise<TokenValidation> {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (response.status === 401) {
      throw new Error("GitHub rejected this token: it is invalid or expired.");
    }
    if (!response.ok) {
      throw new Error(`GitHub rejected this token (HTTP ${response.status}).`);
    }
    const user = (await response.json()) as GitHubUser;
    const scopesHeader = response.headers.get(SCOPE_HEADER) ?? "";
    const scopes = scopesHeader
      .split(",")
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
    return {
      account: mapAccount(user, scopes),
      scopes,
    };
  }

  async listRepositories(query: RepositoriesQuery): Promise<readonly Repository[]> {
    const params: [string, string][] = [perPage(query.limit ?? 30)];
    if (query.query) {
      params.push(["sort", "updated"]);
    }
    // NOTE: /user/repos returns repositories the token can see at all; it
    // includes private repos when the token has the correct scopes.
    const repos = await this.client.get<GitHubRepository[]>("/user/repos", params);
    return repos.map(mapRepository);
  }

  async searchRepositories(query: RepositoriesQuery): Promise<readonly Repository[]> {
    const q = query.query ?? "";
    if (!q) {
      return this.listRepositories(query);
    }
    const results = await this.client.get<{ items: GitHubRepository[] }>("/search/repositories", [
      ["q", `${q} in:name`],
      perPage(query.limit ?? 30),
    ]);
    return results.items.map(mapRepository);
  }

  async listStarredRepositories(limit = 30): Promise<readonly Repository[]> {
    const repos = await this.client.get<GitHubRepository[]>("/user/starred", [perPage(limit)]);
    return repos.map(mapRepository);
  }

  async listOrganizationRepositories(org: string, limit = 30): Promise<readonly Repository[]> {
    const repos = await this.client.get<GitHubRepository[]>(`/orgs/${org}/repos`, [perPage(limit)]);
    return repos.map(mapRepository);
  }

  async listRecentRepositories(limit = 30): Promise<readonly Repository[]> {
    const repos = await this.client.get<GitHubRepository[]>("/user/repos", [
      perPage(limit),
      ["sort", "updated"],
      ["affiliation", "owner,collaborator,organization_member"],
    ]);
    return repos.map(mapRepository);
  }

  async getRepository(fullName: string): Promise<Repository> {
    const repo = await this.client.get<GitHubRepository>(`/repos/${fullName}`);
    return mapRepository(repo);
  }

  async listBranches(fullName: string): Promise<BranchList> {
    const branches = await this.client.get<GitHubBranch[]>(
      `/repos/${fullName}/branches`,
      [perPage(100)],
    );
    return { branches: branches.map(mapBranch) };
  }

  async compareBranches(fullName: string, base: string, head: string): Promise<BranchComparison> {
    const raw = await this.client.get<{
      ahead_by: number;
      behind_by: number;
      status: string;
    }>(`/repos/${fullName}/compare/${base}...${head}`);
    const { ahead_by, behind_by } = raw;
    const status: BranchComparison["status"] =
      ahead_by === 0 && behind_by === 0
        ? "identical"
        : behind_by === 0
          ? "ahead"
          : ahead_by === 0
            ? "behind"
            : "diverged";
    return { base, head, aheadBy: ahead_by, behindBy: behind_by, status };
  }

  async listCommits(
    fullName: string,
    options?: { branch?: string; limit?: number },
  ): Promise<readonly CommitSummary[]> {
    const params: [string, string][] = [perPage(options?.limit ?? 30)];
    if (options?.branch) {
      params.push(["sha", options.branch]);
    }
    const commits = await this.client.get<GitHubCommit[]>(`/repos/${fullName}/commits`, params);
    return commits.map(mapCommit);
  }

  async getCommit(fullName: string, sha: string): Promise<CommitDetail> {
    const raw = await this.client.get<GitHubCommit>(`/repos/${fullName}/commits/${sha}`);
    const summary = mapCommit(raw);
    const detail = raw as GitHubCommit & {
      parents?: { sha: string }[];
      files?: { filename: string; status: string; additions: number; deletions: number }[];
      stats?: { additions: number; deletions: number };
    };
    return {
      ...summary,
      parents: (detail.parents ?? []).map((parent) => parent.sha),
      changes: (detail.files ?? []).map((file) => ({
        filename: file.filename,
        status: file.status as "added" | "modified" | "removed" | "renamed",
        additions: file.additions,
        deletions: file.deletions,
      })),
      additions: detail.stats?.additions ?? 0,
      deletions: detail.stats?.deletions ?? 0,
      patch: null,
    };
  }

  async getLanguages(fullName: string): Promise<ReadonlyMap<string, number>> {
    const langs = await this.client.get<GitHubLanguages>(`/repos/${fullName}/languages`);
    return new Map(Object.entries(langs));
  }

  async getReadme(fullName: string): Promise<string | null> {
    for (const candidate of README_CANDIDATES) {
      const content = await this.tryReadTextFile(fullName, candidate);
      if (content !== null) {
        return content;
      }
    }
    return null;
  }

  private async tryReadTextFile(fullName: string, path: string): Promise<string | null> {
    try {
      const raw = await this.client.get<GitHubContent>(`/repos/${fullName}/contents/${path}`);
      if (raw.encoding === "base64") {
        const binary = atob(raw.content);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return new TextDecoder().decode(bytes);
      }
      return raw.content;
    } catch {
      return null;
    }
  }

  async listContributors(fullName: string, limit = 10): Promise<readonly Contributor[]> {
    const users = await this.client.get<GitHubUser[]>(
      `/repos/${fullName}/contributors`,
      [perPage(limit)],
    );
    return users.map(mapContributor);
  }

  async getRepositoryOverview(fullName: string): Promise<RepositoryOverview> {
    const [repository, languages, readme, releases] = await Promise.all([
      this.getRepository(fullName),
      this.getLanguages(fullName).catch(() => null),
      this.getReadme(fullName),
      this.listReleases(fullName, 1).catch(() => []),
    ]);
    return {
      repository,
      languages,
      readme,
      latestRelease: releases[0]?.tagName ?? null,
      contributors: [],
      isMock: false,
    };
  }

  async listRepositoryActivity(fullName: string, limit = 30): Promise<readonly RepoActivityEvent[]> {
    const events = await this.client.get<GitHubActivityEvent[]>(
      `/repos/${fullName}/events`,
      [perPage(limit ?? 30)],
    );
    return events.map(mapActivityEvent);
  }

  async listPullRequests(fullName: string, query: PullRequestsQuery): Promise<readonly PullRequest[]> {
    const params: [string, string][] = [perPage(query.limit ?? 30)];
    if (query.state && query.state !== "all") {
      params.push(["state", query.state]);
    }
    const pulls = await this.client.get<GitHubPullRequest[]>(
      `/repos/${fullName}/pulls`,
      params,
    );
    return pulls.map(mapPullRequest);
  }

  async getPullRequest(fullName: string, number: number): Promise<PullRequest> {
    const pull = await this.client.get<GitHubPullRequest>(`/repos/${fullName}/pulls/${number}`);
    return mapPullRequest(pull);
  }

  async listIssues(fullName: string, query: IssuesQuery): Promise<readonly Issue[]> {
    const params: [string, string][] = [perPage(query.limit ?? 30)];
    if (query.state && query.state !== "all") {
      params.push(["state", query.state]);
    }
    // /issues would include pull requests; /issues with the repo scope
    // returns only issues. We intentionally hit the repo-scoped endpoint.
    const issues = await this.client.get<GitHubIssue[]>(`/repos/${fullName}/issues`, params);
    return issues
      .filter((issue) => issue.pull_request === undefined)
      .map(mapIssue);
  }

  async getIssue(fullName: string, number: number): Promise<Issue> {
    const issue = await this.client.get<GitHubIssue>(`/repos/${fullName}/issues/${number}`);
    return mapIssue(issue);
  }

  async listReleases(fullName: string, limit = 30): Promise<readonly Release[]> {
    const releases = await this.client.get<GitHubRelease[]>(
      `/repos/${fullName}/releases`,
      [perPage(limit)],
    );
    return releases.map(mapRelease);
  }

  async listTags(fullName: string, limit = 30): Promise<readonly Tag[]> {
    const tags = await this.client.get<GitHubTag[]>(`/repos/${fullName}/tags`, [perPage(limit)]);
    return tags.map(mapTag);
  }

  async listPullRequestCommits(fullName: string, number: number): Promise<readonly CommitSummary[]> {
    const commits = await this.client.get<GitHubCommit[]>(
      `/repos/${fullName}/pulls/${number}/commits`,
      [perPage(100)],
    );
    return commits.map(mapCommit);
  }

  async listPullRequestFiles(fullName: string, number: number) {
    const files = await this.client.get<GitHubPullRequestFile[]>(
      `/repos/${fullName}/pulls/${number}/files`,
      [perPage(100)],
    );
    return files.map(mapPullRequestFile);
  }

  async listPullRequestReviews(fullName: string, number: number): Promise<readonly PullRequestReview[]> {
    const reviews = await this.client.get<GitHubReview[]>(
      `/repos/${fullName}/pulls/${number}/reviews`,
      [perPage(100)],
    );
    return reviews.map(mapReview);
  }

  async listIssueComments(fullName: string, number: number): Promise<readonly IssueComment[]> {
    const comments = await this.client.get<GitHubComment[]>(
      `/repos/${fullName}/issues/${number}/comments`,
      [perPage(100)],
    );
    return comments.map(mapComment);
  }

  // -------------------------------------------------------------------
  // Provider mutations (Slice 6): PR + Issues write operations.
  // -------------------------------------------------------------------

  async createPullRequest(
    fullName: string,
    input: PullRequestCreateInput,
  ): Promise<PullRequest> {
    const created = await this.client.request<GitHubPullRequest>(
      {
        method: "POST",
        body: {
          title: input.title,
          head: input.head,
          base: input.base,
          ...(input.body !== undefined ? { body: input.body } : {}),
          ...(input.draft !== undefined ? { draft: input.draft } : {}),
        },
      },
      `/repos/${fullName}/pulls`,
    );
    return mapPullRequest(created);
  }

  async updatePullRequest(
    fullName: string,
    number: number,
    input: PullRequestUpdateInput,
  ): Promise<PullRequest> {
    const updated = await this.client.request<GitHubPullRequest>(
      {
        method: "PATCH",
        body: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.body !== undefined ? { body: input.body } : {}),
          ...(input.state !== undefined ? { state: input.state } : {}),
        },
      },
      `/repos/${fullName}/pulls/${number}`,
    );
    return mapPullRequest(updated);
  }

  async mergePullRequest(
    fullName: string,
    number: number,
    input: PullRequestMergeInput,
  ): Promise<PullRequest> {
    await this.client.request<{ merged: boolean }>(
      {
        method: "PUT",
        body: { merge_method: input.method },
      },
      `/repos/${fullName}/pulls/${number}/merge`,
    );
    return this.getPullRequest(fullName, number);
  }

  async submitPullRequestReview(
    fullName: string,
    number: number,
    input: PullRequestReviewInput,
  ): Promise<PullRequestReview> {
    const events: Record<PullRequestReviewInput["event"], string> = {
      approve: "APPROVE",
      request_changes: "REQUEST_CHANGES",
      comment: "COMMENT",
    };
    const review = await this.client.request<GitHubReview>(
      {
        method: "POST",
        body: {
          event: events[input.event],
          ...(input.body !== undefined ? { body: input.body } : {}),
        },
      },
      `/repos/${fullName}/pulls/${number}/reviews`,
    );
    return mapReview(review);
  }

  async addIssueComment(fullName: string, number: number, body: string): Promise<IssueComment> {
    const comment = await this.client.request<GitHubComment>(
      { method: "POST", body: { body } },
      `/repos/${fullName}/issues/${number}/comments`,
    );
    return mapComment(comment);
  }

  async updateIssue(
    fullName: string,
    number: number,
    input: IssueUpdateInput,
  ): Promise<Issue> {
    const updated = await this.client.request<GitHubIssue>(
      {
        method: "PATCH",
        body: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.body !== undefined ? { body: input.body } : {}),
          ...(input.state !== undefined ? { state: input.state } : {}),
        },
      },
      `/repos/${fullName}/issues/${number}`,
    );
    return mapIssue(updated);
  }

  async setIssueLabels(
    fullName: string,
    number: number,
    labels: readonly string[],
  ): Promise<Issue["labels"]> {
    const result = await this.client.request<{ name: string; color: string }[]>(
      { method: "PUT", body: { labels: [...labels] } },
      `/repos/${fullName}/issues/${number}/labels`,
    );
    return result.map((label) => ({ name: label.name, color: label.color }));
  }

  async createIssue(
    fullName: string,
    input: { readonly title: string; readonly body?: string },
  ): Promise<Issue> {
    const created = await this.client.request<GitHubIssue>(
      { method: "POST", body: { title: input.title, ...(input.body ? { body: input.body } : {}) } },
      `/repos/${fullName}/issues`,
    );
    return mapIssue(created);
  }

  async searchCommits(fullName: string, query: string, limit = 15): Promise<readonly CommitSummary[]> {
    const results = await this.client.get<GitHubSearchCommits>("/search/commits", [
      ["q", `repo:${fullName} ${query}`],
      perPage(limit),
    ]);
    return (results.items ?? []).map(mapCommit);
  }

  async searchIssues(fullName: string, query: string, limit = 15): Promise<readonly Issue[]> {
    const results = await this.client.get<GitHubSearchIssues>("/search/issues", [
      ["q", `repo:${fullName} type:issue ${query}`],
      perPage(limit),
    ]);
    return (results.items ?? []).filter((item) => !("pull_request" in item)).map((item) => mapIssue(item as GitHubIssue));
  }

  async searchPullRequests(fullName: string, query: string, limit = 15): Promise<readonly PullRequest[]> {
    const results = await this.client.get<GitHubSearchIssues>("/search/issues", [
      ["q", `repo:${fullName} type:pr ${query}`],
      perPage(limit),
    ]);
    return (results.items ?? []).map((item) => mapPullRequest(item as GitHubPullRequest));
  }

  async listNotifications(limit = 30): Promise<readonly AppNotification[]> {
    const notifications = await this.client.get<GitHubNotification[]>("/notifications", [
      ["all", "false"],
      perPage(limit),
    ]);
    return notifications.map(mapNotification);
  }

  async listWorkflowRuns(fullName: string, limit = 10): Promise<readonly WorkflowRun[]> {
    const runs = await this.client.get<{ workflow_runs: GitHubWorkflowRun[] }>(
      `/repos/${fullName}/actions/runs`,
      [perPage(limit)],
    );
    return (runs.workflow_runs ?? []).map(mapWorkflowRun);
  }

  async getCheckRuns(fullName: string, ref: string): Promise<readonly CheckRun[]> {
    const runs = await this.client.get<{ check_runs: GitHubCheckRun[] }>(
      `/repos/${fullName}/commits/${ref}/check-runs`,
      [perPage(100)],
    );
    return (runs.check_runs ?? []).map(mapCheckRun);
  }

  async getCommitActivity(fullName: string) {
    const weeks = await this.client.get<GitHubCommitActivityWeek[]>(
      `/repos/${fullName}/stats/commit_activity`,
    );
    return weeks.map(mapCommitActivity);
  }

  async getRepositoryTree(fullName: string, branch: string) {
    const tree = await this.client.get<GitHubTree>(`/repos/${fullName}/git/trees/${encodeURIComponent(branch)}`, [
      ["recursive", "1"],
    ]);
    return tree.tree.map(mapTreeEntry);
  }

  async getFileContents(fullName: string, path: string, ref?: string) {
    const query: [string, string][] = [];
    if (ref) {
      query.push(["ref", ref]);
    }
    try {
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
      const raw = await this.client.get<GitHubContentItem>(
        `/repos/${fullName}/contents/${encodedPath}`,
        query,
      );
      return mapContentItem(raw);
    } catch (error) {
      if (error instanceof GitHubApiError && (error.reason === "not_found" || error.reason === "forbidden")) {
        return null;
      }
      throw error;
    }
  }

  async listOrganizations(limit = 50): Promise<readonly Organization[]> {
    const orgs = await this.client.get<GitHubOrganization[]>("/user/orgs", [perPage(limit)]);
    return orgs.map(mapOrganization);
  }
}

export type { Page };
