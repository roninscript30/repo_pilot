import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { resolveGitRuntime } from "@/services/runtime";
import type { GitOperation, GitOperationResult } from "@/domain/ports/git-runtime";

const SANDBOX_OPERATIONS: readonly {
  readonly operation: GitOperation;
  readonly label: string;
  readonly description: string;
  readonly icon: "gitBranch" | "gitPull" | "gitCommit" | "inbox";
}[] = [
  { operation: "create-branch", label: "Create branch", description: "Disposable branch in a throwaway repo", icon: "gitBranch" },
  { operation: "checkout", label: "Checkout", description: "Switch branches safely in the sandbox", icon: "gitPull" },
  { operation: "commit", label: "Commit", description: "Commit with a seed message in an isolated repo", icon: "gitCommit" },
  { operation: "stash", label: "Stash", description: "Stash and restore changes in the sandbox", icon: "inbox" },
];

function resultStyle(result: GitOperationResult): { container: string; icon: "checkCircle" | "alertCircle" } {
  if (result.unsupported) {
    return { container: "border-warning-500/30 bg-warning-50 text-warning-700 dark:bg-warning-50/10 dark:text-warning-600", icon: "alertCircle" };
  }
  if (result.ok) {
    return { container: "border-success-500/30 bg-success-50 text-success-700 dark:bg-success-50/10 dark:text-success-600", icon: "checkCircle" };
  }
  return { container: "border-danger-500/30 bg-danger-50 text-danger-700 dark:bg-danger-50/10 dark:text-danger-600", icon: "alertCircle" };
}

/**
 * Git Sandbox page.
 *
 * Safe execution of Git operations in isolated, disposable repositories.
 * In desktop mode the sandbox seeds a temporary repository and runs real
 * gitoxide operations; in browser preview it reports the requirement
 * transparently instead of faking success (ADR-0006).
 */
export function SandboxPage() {
  const runtime = resolveGitRuntime();
  const [seed, setSeed] = useState("gitos-sandbox-seed");
  const [result, setResult] = useState<GitOperationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const isPreview = runtime.kind === "web-fallback";

  async function runInSandbox(operation: GitOperation) {
    setIsRunning(true);
    setResult(null);
    try {
      const outcome = await runtime.runInSandbox(operation, seed.trim() || "gitos-sandbox-seed");
      setResult(outcome);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-5">
        <h1 className="text-lg font-bold text-surface-900 dark:text-surface-100">Git Sandbox</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Safely execute Git operations inside isolated, disposable repositories. Nothing here
          touches production repositories.
        </p>
      </div>

      {isPreview ? (
        <EmptyState
          title="Sandbox requires the desktop runtime"
          description="Browser preview keeps itself safe by never executing Git. Open the native Tauri shell to create temporary repositories and run merge, rebase, and squash simulations."
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Sandbox repository"
              subtitle="A throwaway repository is seeded per operation"
              action={<Badge tone="success">isolated</Badge>}
            />
            <div className="flex items-end gap-3 p-4">
              <div className="flex-1">
                <TextField
                  label="Seed name"
                  value={seed}
                  onChange={(event) => setSeed(event.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="mb-0.5 flex items-center gap-2">
                <Badge>{runtime.kind}</Badge>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Simulation" />
            <ul className="divide-y divide-surface-100 dark:divide-surface-700/60">
              {SANDBOX_OPERATIONS.map(({ operation, label, description, icon }) => (
                <li key={operation} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-300">
                      <Icon name={icon} size={14} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{label}</p>
                      <p className="truncate text-xs text-surface-500 dark:text-surface-400">{description}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={isRunning}
                    onClick={() => void runInSandbox(operation)}
                  >
                    {isRunning ? "Running…" : "Run"}
                  </Button>
                </li>
              ))}
            </ul>
          </Card>

          {result ? (
            <div
              role="status"
              className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-xs ${resultStyle(result).container}`}
            >
              <Icon name={resultStyle(result).icon} size={14} />
              {result.message}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
