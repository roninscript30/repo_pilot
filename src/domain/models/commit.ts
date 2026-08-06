export interface CommitAuthor {
  readonly name: string;
  readonly email: string;
  readonly login: string | null;
  readonly avatarUrl: string | null;
}

/** First 7 characters of a commit sha, the conventional short form. */
export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

export interface CommitSummary {
  readonly sha: string;
  readonly shortSha: string;
  readonly message: string;
  readonly subject: string;
  readonly author: CommitAuthor;
  readonly committedAt: string;
  /** Parent shas, used for graph lanes. */
  readonly parents: readonly string[];
}

export interface CommitFileChange {
  readonly filename: string;
  readonly status: "added" | "modified" | "removed" | "renamed";
  readonly additions: number;
  readonly deletions: number;
}

export interface CommitDetail extends CommitSummary {
  readonly parents: readonly string[];
  readonly changes: readonly CommitFileChange[];
  readonly additions: number;
  readonly deletions: number;
  readonly patch: string | null;
}
