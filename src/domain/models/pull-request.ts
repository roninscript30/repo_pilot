import type { CommitSummary } from "./commit";

export type PullRequestState = "open" | "closed" | "merged";

export type PullRequestReviewDecision =
  | "approved"
  | "changes_requested"
  | "review_required"
  | "none";

export interface PullRequest {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: PullRequestState;
  readonly url: string;
  readonly isDraft: boolean;
  readonly isMerged: boolean;
  readonly baseBranch: string;
  readonly headBranch: string;
  readonly author: {
    readonly login: string;
    readonly avatarUrl: string | null;
  };
  readonly mergedAt: string | null;
  readonly closedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly additions: number | null;
  readonly deletions: number | null;
  readonly changedFiles: number | null;
  readonly reviewDecision: PullRequestReviewDecision;
  readonly commits: readonly CommitSummary[] | null;
  /** Null when the provider could not determine mergeability. */
  readonly mergeable: boolean | null;
  /** If the review state could not be determined with available scopes. */
  readonly reviewStateUnknown: boolean;
}
