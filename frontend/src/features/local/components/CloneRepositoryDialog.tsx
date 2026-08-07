import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SelectField } from "@/components/ui/SelectField";
import { Spinner } from "@/components/ui/Spinner";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/toast-context";
import { useCloneRepository, useGitProgress } from "@/features/git/hooks";
import { clonePayload, type ClonePayloadOptions } from "@/features/git/lib/payloads";
import { repoFullNameFromUrl, repoNameFromUrl } from "@/features/local/lib/clone";
import { useLocalReposStore } from "@/features/local/store";
import { pickFolder } from "@/services/dialog";
import { useAuthStore } from "@/stores/auth-store";

interface CloneRepositoryDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Called with the cloned path when a clone completes. */
  readonly onCloned?: (path: string) => void;
}

/**
 * Clone a remote repository into a local folder and track it as a local
 * repository (linked to its GitHub full name when the URL is GitHub).
 * Desktop-only: browser preview surfaces the desktop-runtime message.
 */
export function CloneRepositoryDialog({ open, onClose, onCloned }: CloneRepositoryDialogProps) {
  const { toast } = useToast();
  const accounts = useAuthStore((state) => state.accounts);
  const activeLogin = useAuthStore((state) => state.account?.login ?? null);
  const add = useLocalReposStore((state) => state.add);

  const [url, setUrl] = useState("");
  const [parentDir, setParentDir] = useState("");
  const [depth, setDepth] = useState("");
  const [branch, setBranch] = useState("");
  const [accountLogin, setAccountLogin] = useState<string>("");
  const [picking, setPicking] = useState(false);

  const operationIdRef = useRef<string>("");
  if (!operationIdRef.current) operationIdRef.current = crypto.randomUUID();

  const clone = useCloneRepository();
  const progress = useGitProgress(operationIdRef.current);

  const targetDir = useMemo(() => {
    const name = repoNameFromUrl(url);
    if (!parentDir.trim() || !name) return "";
    return `${parentDir.replace(/\/+$/, "")}/${name}`;
  }, [parentDir, url]);

  const fullName = repoFullNameFromUrl(url);

  // Reset transient state when the dialog opens fresh.
  useEffect(() => {
    if (open) {
      setUrl("");
      setParentDir("");
      setDepth("");
      setBranch("");
      setAccountLogin("");
    }
  }, [open]);

  async function browse() {
    setPicking(true);
    try {
      const folder = await pickFolder();
      if (folder) setParentDir(folder);
    } finally {
      setPicking(false);
    }
  }

  const valid = url.trim().length > 0 && parentDir.trim().length > 0 && !clone.isPending;

  async function submit() {
    if (!valid) return;
    operationIdRef.current = crypto.randomUUID();
    const depthNumber = Number.parseInt(depth, 10);
    const login = accountLogin || activeLogin;
    const options: ClonePayloadOptions = {
      ...(Number.isFinite(depthNumber) && depthNumber > 0 ? { depth: depthNumber } : {}),
      ...(branch.trim() ? { branch: branch.trim() } : {}),
      ...(login ? { accountLogin: login } : {}),
    };
    const input = clonePayload(url.trim(), targetDir, operationIdRef.current, options);

    clone.mutate(input, {
      onSuccess: (outcome) => {
        if (outcome.ok) {
          add(targetDir, fullName);
          toast({ title: "Repository cloned", description: targetDir, tone: "success" });
          onCloned?.(targetDir);
          onClose();
        } else {
          toast({ title: "Clone failed", description: outcome.message, tone: "error" });
        }
      },
      onError: (error) => {
        toast({
          title: "Clone failed",
          description: error instanceof Error ? error.message : "The desktop runtime is required to clone.",
          tone: "error",
        });
      },
    });
  }

  const busy = clone.isPending || picking;

  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Clone repository"
      description="Clone a remote repository into a local folder and link it to the workspace."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid} data-testid="clone-submit">
            {clone.isPending ? <Spinner label="Cloning…" size="sm" /> : <Icon name="plus" size={14} />}
            Clone
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Repository URL"
          placeholder="https://github.com/octocat/hello-world.git"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          autoFocus
        />
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextField
              label="Destination folder"
              placeholder="/home/you/repositories"
              value={parentDir}
              onChange={(event) => setParentDir(event.target.value)}
            />
          </div>
          <Button onClick={browse} disabled={busy}>
            {picking ? <Spinner label="Picking folder…" size="sm" /> : <Icon name="folder" size={14} />}
            Browse
          </Button>
        </div>
        {targetDir ? (
          <p className="-mt-2 text-xs text-surface-500">
            Will clone into <span className="font-mono text-surface-800 dark:text-surface-200">{targetDir}</span>
          </p>
        ) : null}
        {fullName ? (
          <p className="-mt-2 text-xs text-surface-500">
            GitHub repository <span className="font-mono">{fullName}</span> will be linked to the local copy.
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Depth (optional)"
            placeholder="e.g. 1 for shallow"
            value={depth}
            onChange={(event) => setDepth(event.target.value)}
            inputMode="numeric"
          />
          <TextField
            label="Branch (optional)"
            placeholder="main"
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
          />
        </div>
        {accounts.length > 0 ? (
          <SelectField
            label="Authenticate as"
            value={accountLogin || activeLogin || ""}
            onChange={(event) => setAccountLogin(event.target.value)}
            options={[
              { value: activeLogin ?? "", label: activeLogin ? `${activeLogin} (active)` : "No account" },
              ...accounts
                .filter((account) => account.login !== activeLogin)
                .map((account) => ({ value: account.login, label: account.displayName })),
            ]}
          />
        ) : null}
        {progress ? (
          <div className="rounded-md border border-surface-200 p-3 dark:border-surface-700">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-surface-600 dark:text-surface-300">{progress.text}</span>
              {progress.percent !== null ? (
                <span className="shrink-0 font-mono text-surface-500">{progress.percent}%</span>
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
      </div>
    </Dialog>
  );
}
