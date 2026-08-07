export type PullRequestReviewState =
  | "approved"
  | "changes_requested"
  | "commented"
  | "dismissed"
  | "pending"
  | "other";

/** A pull request review by a collaborator. */
export interface PullRequestReview {
  readonly id: string;
  readonly author: {
    readonly login: string;
    readonly avatarUrl: string | null;
  };
  readonly state: PullRequestReviewState;
  readonly body: string | null;
  readonly submittedAt: string | null;
}
