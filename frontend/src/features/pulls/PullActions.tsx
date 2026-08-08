import { useState } from "react";
import { useMergePullRequest, usePullRequestAction, useSubmitPullRequestReview } from "@/features/pulls/hooks";
import type { PullRequest } from "@/domain/models/pull-request";
import type { PullRequestMergeInput, PullRequestReviewInput } from "@/domain/ports/provider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextArea } from "@/components/ui/TextArea";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/toast-context";

const MERGE_METHODS: { value: PullRequestMergeInput["method"]; label: string }[] = [
  { value: "merge", label: "Merge" },
  { value: "squash", label: "Squash" },
  { value: "rebase", label: "Rebase" },
];

export function MergePullRequestDialog({ fullName, pull, onClose }: { fullName: string; pull: PullRequest; onClose: () => void }) {
  const { toast } = useToast();
  const merge = useMergePullRequest(fullName, pull.number);
  const [method, setMethod] = useState<PullRequestMergeInput["method"]>("merge");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    merge.mutate(
      { method },
      {
        onSuccess: () => {
          toast({ title: `Pull request #${pull.number} merged`, tone: "success" });
          onClose();
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Merge failed. Check that the PR is open and mergeable.");
        },
      },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Merge pull request #${pull.number}`}
      description={`${pull.title} — ${pull.baseBranch} ← ${pull.headBranch}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={merge.isPending || pull.mergeable === false}>
            {merge.isPending ? "Merging…" : `Merge via ${method}`}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <SegmentedControl
          ariaLabel="Merge method"
          options={MERGE_METHODS}
          value={method}
          onChange={(value) => setMethod(value as PullRequestMergeInput["method"])}
        />
        {pull.mergeable === false ? (
          <p role="alert" className="text-xs text-danger-600">
            This pull request has merge conflicts and cannot be merged.
          </p>
        ) : null}
        {error ? <p role="alert" className="text-xs text-danger-600">{error}</p> : null}
      </div>
    </Dialog>
  );
}

export function ReviewPullRequestDialog({
  fullName,
  pull,
  event,
  onClose,
}: {
  fullName: string;
  pull: PullRequest;
  event: Exclude<PullRequestReviewInput["event"], "comment">;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const submit = useSubmitPullRequestReview(fullName, pull.number);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const approving = event === "approve";

  function submitReview() {
    setError(null);
    submit.mutate(
      { event, ...(body.trim() ? { body: body.trim() } : {}) },
      {
        onSuccess: () => {
          toast({ title: approving ? "Review approved" : "Changes requested", tone: approving ? "success" : "error" });
          onClose();
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Could not submit review.");
        },
      },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={approving ? `Approve #${pull.number}` : `Request changes on #${pull.number}`}
      description="Your review is posted publicly on the pull request."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={approving ? "primary" : "danger"} onClick={submitReview} disabled={submit.isPending}>
            {submit.isPending ? "Submitting…" : approving ? "Approve" : "Request changes"}
          </Button>
        </>
      }
    >
      <TextArea
        label="Optional feedback"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Leave a comment with your review…"
        rows={5}
      />
      {error ? <p role="alert" className="text-xs text-danger-600">{error}</p> : null}
    </Dialog>
  );
}

export function PullRequestCommentComposer({ fullName, pull }: { fullName: string; pull: PullRequest }) {
  const { toast } = useToast();
  const action = usePullRequestAction(fullName, pull.number);
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"comment" | "review">("comment");

  function submit() {
    if (body.trim().length === 0) return;
    action.mutate(
      { kind: mode, body: body.trim() },
      {
        onSuccess: () => {
          setBody("");
          toast({ title: mode === "comment" ? "Comment posted" : "Review comment posted", tone: "success" });
        },
        onError: (err) => {
          toast({ title: err instanceof Error ? err.message : "Could not post comment.", tone: "error" });
        },
      },
    );
  }

  return (
    <Cardish className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <SegmentedControl
          ariaLabel="Comment type"
          size="sm"
          options={[
            { value: "comment", label: "Comment" },
            { value: "review", label: "Review comment" },
          ]}
          value={mode}
          onChange={(value) => setMode(value as "comment" | "review")}
        />
        <span className="text-2xs text-surface-400">Only shown to repo collaborators</span>
      </div>
      <TextArea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Leave a comment…"
        rows={3}
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={body.trim().length === 0 || action.isPending}>
          {action.isPending ? "Posting…" : "Comment"}
        </Button>
      </div>
    </Cardish>
  );
}

function Cardish({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-lg border border-surface-200 bg-surface-50/50 p-3 dark:border-surface-700 dark:bg-surface-800/40 ${className}`}>{children}</div>;
}
