import type { CommitSummary } from "./commit";

/** A provider-neutral branch. */
export interface Branch {
  readonly name: string;
  readonly isProtected: boolean;
  readonly latestCommit: CommitSummary | null;
}

/** Provider-neutral branch comparison result. */
export interface BranchComparison {
  readonly base: string;
  readonly head: string;
  readonly aheadBy: number;
  readonly behindBy: number;
  readonly status: "identical" | "ahead" | "behind" | "diverged";
}
