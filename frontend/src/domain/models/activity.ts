/** Category of a repository activity event (provider-neutral). */
export type ActivityKind =
  | "push"
  | "pull_request"
  | "issue"
  | "release"
  | "fork"
  | "watch"
  | "comment"
  | "other";

/** One entry of the repository activity feed. */
export interface RepoActivityEvent {
  readonly id: string;
  readonly kind: ActivityKind;
  readonly actor: {
    readonly login: string;
    readonly avatarUrl: string | null;
  };
  /** Human-readable summary assembled by the provider adapter. */
  readonly description: string;
  readonly createdAt: string;
  readonly url: string | null;
}
