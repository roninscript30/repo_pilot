export type WorkflowRunStatus = "queued" | "in_progress" | "completed" | "unknown";

export type WorkflowRunConclusion = "success" | "failure" | "cancelled" | "skipped" | "neutral" | null;

/** A single workflow run (Actions / CI) for a repository. */
export interface WorkflowRun {
  readonly id: string;
  readonly name: string;
  readonly displayTitle: string;
  readonly headBranch: string;
  readonly headSha: string;
  readonly runNumber: number;
  readonly status: WorkflowRunStatus;
  readonly conclusion: WorkflowRunConclusion;
  readonly url: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A check run reported against a commit (checks API). */
export interface CheckRun {
  readonly id: string;
  readonly name: string;
  readonly status: "queued" | "in_progress" | "completed";
  readonly conclusion: string | null;
}
