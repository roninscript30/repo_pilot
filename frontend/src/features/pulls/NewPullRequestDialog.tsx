import { useEffect, useMemo, useState } from "react";
import { useCreatePullRequest, useRemoteBranches } from "@/features/pulls/hooks";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/toast-context";

const EMPTY = "__unset__";

export function NewPullRequestDialog({ fullName, onClose }: { fullName: string; onClose: () => void }) {
  const { toast } = useToast();
  const branches = useRemoteBranches(fullName);
  const create = useCreatePullRequest(fullName);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [base, setBase] = useState<string>(EMPTY);
  const [head, setHead] = useState<string>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const branchNames = useMemo(
    () => branches.data?.branches.map((branch) => branch.name) ?? [],
    [branches.data],
  );

  useEffect(() => {
    if (base === EMPTY && branchNames.length > 0) {
      const first = branchNames[0];
      if (first !== undefined) setBase(first);
    }
  }, [base, branchNames]);

  function submit() {
    if (title.trim().length === 0 || base === EMPTY || head === EMPTY) return;
    setError(null);
    create.mutate(
      { title: title.trim(), base, head, ...(body.trim() ? { body: body.trim() } : {}) },
      {
        onSuccess: (pull) => {
          toast({ title: `Pull request #${pull.number} created`, tone: "success" });
          onClose();
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Could not create pull request.");
        },
      },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="New pull request"
      description={`Open a pull request in ${fullName}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={title.trim().length === 0 || base === EMPTY || head === EMPTY || create.isPending}
          >
            {create.isPending ? "Creating…" : "Create pull request"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-2xs font-medium text-surface-500">Base</span>
            <select
              className="h-9 w-full rounded-md border border-surface-200 bg-transparent px-2 text-sm text-surface-800 outline-none focus:border-accent-500 dark:border-surface-600 dark:text-surface-200"
              value={base}
              onChange={(event) => setBase(event.target.value)}
            >
              <option value={EMPTY} disabled>Select base branch…</option>
              {branchNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-2xs font-medium text-surface-500">Head</span>
            <select
              className="h-9 w-full rounded-md border border-surface-200 bg-transparent px-2 text-sm text-surface-800 outline-none focus:border-accent-500 dark:border-surface-600 dark:text-surface-200"
              value={head}
              onChange={(event) => setHead(event.target.value)}
            >
              <option value={EMPTY} disabled>Select head branch…</option>
              {branchNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
        {branches.isLoading ? (
          <p className="text-2xs text-surface-400">Loading branches…</p>
        ) : branches.isError ? (
          <p role="alert" className="text-xs text-danger-600">
            Could not load branches: {branches.error instanceof Error ? branches.error.message : "unknown error"}
          </p>
        ) : null}
        <TextField
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Summary of the change"
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <TextArea
          label="Description"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What does this pull request do? (markdown supported)"
          rows={5}
        />
        {error ? <p role="alert" className="text-xs text-danger-600">{error}</p> : null}
      </div>
    </Dialog>
  );
}
