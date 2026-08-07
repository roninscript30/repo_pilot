import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SelectField } from "@/components/ui/SelectField";
import { Spinner } from "@/components/ui/Spinner";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/toast-context";
import { useGitProgress, type useRunGitOperation } from "@/features/git/hooks";
import { commitPayload, pullPayload, pushPayload } from "@/features/git/lib/payloads";
import { remoteNameFor } from "@/features/git/lib/remotes";
import {
  loadCommitTemplates,
  removeCommitTemplate,
  saveCommitTemplate,
  SUBJECT_MAX_LENGTH,
  validateCommitMessage,
  type CommitTemplate,
} from "@/features/worktree/lib/commit";
import { useLocalReposStore } from "@/features/local/store";
import { useAuthStore } from "@/stores/auth-store";
import type { GitOperation, WorktreeStatus } from "@/domain/ports/git-runtime";

const NETWORK_OPERATION_ID = "git-run-operation";

interface CommitCenterProps {
  readonly path: string;
  readonly status: WorktreeStatus;
  readonly run: ReturnType<typeof useRunGitOperation>;
  /** Called after a successful commit so the parent can clear selection. */
  readonly onCommitted: () => void;
  /** Open the staged file in the main diff pane. */
  readonly onInspectFile?: (path: string) => void;
}

/**
 * The Commit Center: message editor with templates and validation, a live
 * preview of the staged changes, amend/empty/signed toggles, and Commit /
 * Commit & Push / Commit & Sync actions. Commit state lives here so the
 * card owns its lifecycle; the parent only reacts to success (ADR-0006).
 */
export function CommitCenter({ path, status, run, onCommitted, onInspectFile }: CommitCenterProps) {
  const { toast } = useToast();
  const activeLogin = useAuthStore((state) => state.account?.login ?? null);
  const accountLogins = useLocalReposStore((state) => {
    const entry = state.repositories.find((candidate) => candidate.path === path);
    return entry?.accountLogins ?? {};
  });

  const [message, setMessage] = useState("");
  const [amend, setAmend] = useState(false);
  const [allowEmpty, setAllowEmpty] = useState(false);
  const [signed, setSigned] = useState(false);
  const [templates, setTemplates] = useState<readonly CommitTemplate[]>(() => loadCommitTemplates());
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const progress = useGitProgress(NETWORK_OPERATION_ID);

  const stagedFiles = useMemo(
    () => status.files.filter((file) => file.state === "staged"),
    [status],
  );

  const stagedStats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    for (const file of stagedFiles) {
      additions += file.stagedAdditions;
      deletions += file.stagedDeletions;
    }
    return { additions, deletions };
  }, [stagedFiles]);

  const issues = validateCommitMessage(message);
  const remote = remoteNameFor(status.trackingBranch);
  const accountLogin = (remote ? accountLogins[remote] : undefined) ?? activeLogin;
  const currentBranch = status.currentBranch ?? undefined;

  const commitDisabled =
    stagedFiles.length === 0 || issues.empty || run.isPending;

  function networkOptions() {
    return {
      ...(currentBranch !== undefined ? { branch: currentBranch } : {}),
      ...(accountLogin ? { accountLogin } : {}),
    };
  }

  async function runOp(operation: GitOperation, payload: Record<string, unknown>): Promise<boolean> {
    const outcome = await run.mutateAsync({ operation, payload });
    const tone = outcome.ok ? "success" : "error";
    const title = outcome.ok ? "Succeeded" : "Failed";
    toast({ title: `${operationLabel(operation)} ${title}`, description: outcome.message, tone });
    return outcome.ok;
  }

  async function commitAnd(rest: () => Promise<void>) {
    if (commitDisabled) return;
    const payload = commitPayload(message, {
      ...(amend ? { amend: true } : {}),
      ...(allowEmpty ? { empty: true } : {}),
      ...(signed ? { signed: true } : {}),
    });
    const committed = await runOp("commit", payload);
    if (!committed) return;
    setMessage("");
    setAmend(false);
    onCommitted();
    await rest();
  }

  async function handleCommit() {
    await commitAnd(async () => undefined);
  }

  async function handleCommitAndPush() {
    await commitAnd(async () => {
      await runOp("push", pushPayload(undefined, { ...networkOptions(), setUpstream: !status.trackingBranch }));
    });
  }

  async function handleCommitAndSync() {
    await commitAnd(async () => {
      const pulled = await runOp("pull", pullPayload(undefined, { ...networkOptions(), rebase: true }));
      if (!pulled) return;
      await runOp("push", pushPayload(undefined, { ...networkOptions(), setUpstream: !status.trackingBranch }));
    });
  }

  function applyTemplate(name: string) {
    setSelectedTemplate(name);
    const template = templates.find((candidate) => candidate.name === name);
    if (template) setMessage(template.message);
  }

  function saveCurrentAsTemplate() {
    if (issues.empty) return;
    const subject = message.trim().split("\n")[0] ?? "";
    const name = subject.slice(0, 48);
    if (!name) return;
    const next = saveCommitTemplate({ name, message });
    setTemplates(next);
    setSelectedTemplate(name);
    toast({ title: "Template saved", description: name, tone: "success" });
  }

  function deleteSelectedTemplate() {
    if (!selectedTemplate) return;
    const next = removeCommitTemplate(selectedTemplate);
    setTemplates(next);
    setSelectedTemplate("");
  }

  const templateOptions = useMemo(
    () => [
      { value: "", label: "Templates…" },
      ...templates.map((template) => ({ value: template.name, label: template.name })),
    ],
    [templates],
  );

  const subject = message.trim().split("\n")[0] ?? "";
  const messageError = issues.empty ? "Message is required." : null;
  const messageHint = !issues.empty
    ? issues.subjectTooLong
      ? `Subject is ${subject.length} characters; keep it under ${SUBJECT_MAX_LENGTH}.`
      : issues.wip
        ? "This looks like a work-in-progress message."
        : null
    : null;

  return (
    <Card>
      <CardHeader
        title={amend ? "Amend commit" : "Commit Center"}
        subtitle={
          stagedFiles.length > 0
            ? `${stagedFiles.length} file${stagedFiles.length === 1 ? "" : "s"} staged · +${stagedStats.additions} −${stagedStats.deletions}`
            : "Nothing staged"
        }
      />
      <div className="space-y-3 p-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <SelectField
              aria-label="Commit template"
              value={selectedTemplate}
              onChange={(event) => applyTemplate(event.target.value)}
              options={templateOptions}
            />
          </div>
          <Button size="sm" variant="secondary" disabled={issues.empty} onClick={saveCurrentAsTemplate}>
            <Icon name="plus" size={13} />
            Save template
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!selectedTemplate}
            onClick={deleteSelectedTemplate}
            aria-label="Delete selected template"
          >
            <Icon name="trash" size={13} />
          </Button>
        </div>

        <TextArea
          label="Message"
          placeholder="Summarize the change (subject under 72 characters)"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          {...(messageError ? { error: messageError } : {})}
          {...(messageHint ? { hint: messageHint } : {})}
        />

        <div className="flex flex-wrap items-center gap-3 text-2xs text-surface-600 dark:text-surface-300">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={amend}
              onChange={(event) => setAmend(event.target.checked)}
              className="accent-accent-500"
            />
            Amend last commit
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={allowEmpty}
              onChange={(event) => setAllowEmpty(event.target.checked)}
              className="accent-accent-500"
            />
            Allow empty
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={signed}
              onChange={(event) => setSigned(event.target.checked)}
              className="accent-accent-500"
            />
            Sign (GPG)
          </label>
        </div>

        {stagedFiles.length > 0 ? (
          <div className="rounded-md border border-surface-200 dark:border-surface-700">
            <div className="border-b border-surface-100 px-3 py-1.5 text-2xs font-medium uppercase tracking-wide text-surface-500 dark:border-surface-700/60 dark:text-surface-400">
              Will commit
            </div>
            <ul className="max-h-40 divide-y divide-surface-100 overflow-y-auto dark:divide-surface-700/60">
              {stagedFiles.map((file) => (
                <li key={file.path} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                  <Icon name="fileText" size={13} className="shrink-0 text-surface-400" />
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left font-mono text-surface-700 hover:text-accent-500 dark:text-surface-300"
                    onClick={() => onInspectFile?.(file.path)}
                    title="Open in diff"
                  >
                    {file.path}
                  </button>
                  <span className="shrink-0 font-mono text-success-600 dark:text-success-500">
                    +{file.stagedAdditions}
                  </span>
                  <span className="shrink-0 font-mono text-danger-600 dark:text-danger-500">
                    −{file.stagedDeletions}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {progress && !progress.text.endsWith("100%") ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-2xs text-surface-500">
              <span className="truncate">{progress.text}</span>
              {progress.percent !== null ? (
                <span className="font-mono">{progress.percent}%</span>
              ) : null}
            </div>
            {progress.percent !== null ? (
              <ProgressBar value={progress.percent} />
            ) : (
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-accent-500" />
              </div>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={commitDisabled}
            onClick={() => void handleCommitAndPush()}
          >
            {run.isPending ? <Spinner label="Working…" size="sm" /> : <Icon name="gitPush" size={14} />}
            Commit &amp; Push
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={commitDisabled}
            onClick={() => void handleCommitAndSync()}
          >
            {run.isPending ? <Spinner label="Working…" size="sm" /> : <Icon name="gitPull" size={14} />}
            Commit &amp; Sync
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={commitDisabled}
            onClick={() => void handleCommit()}
            data-testid="commit-center-submit"
          >
            {run.isPending ? <Spinner label="Committing…" size="sm" /> : <Icon name="gitCommit" size={14} />}
            {amend ? "Amend" : "Commit"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function operationLabel(operation: GitOperation): string {
  switch (operation) {
    case "commit":
      return "Commit";
    case "push":
      return "Push";
    case "pull":
      return "Pull";
    default:
      return "Operation";
  }
}
