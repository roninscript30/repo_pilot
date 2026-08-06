import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import type {
  GitOperation,
  GitOperationResult,
  GitRuntime,
} from "@/domain/ports/git-runtime";

interface GitOperationsPanelProps {
  readonly runtime: GitRuntime;
  readonly repoPath: string;
}

const OPERATIONS: readonly {
  readonly operation: GitOperation;
  readonly label: string;
}[] = [
  { operation: "fetch", label: "Fetch" },
  { operation: "pull", label: "Pull" },
  { operation: "push", label: "Push" },
  { operation: "commit", label: "Commit" },
  { operation: "stage", label: "Stage" },
  { operation: "unstage", label: "Unstage" },
  { operation: "create-branch", label: "New branch" },
  { operation: "checkout", label: "Checkout" },
  { operation: "tag", label: "Tag" },
  { operation: "stash", label: "Stash" },
];

/**
 * Visual Git operation surface.
 *
 * All operations flow through the GitRuntime port. In the desktop
 * shell the runtime executes real gitoxide-backed operations; in
 * browser preview it returns a transparent "requires desktop runtime"
 * result so the UI never fakes repository state (ADR-0006).
 */
export function GitOperationsPanel({ runtime, repoPath }: GitOperationsPanelProps) {
  const [result, setResult] = useState<GitOperationResult | null>(null);
  const [messageInput, setMessageInput] = useState("");

  async function runOperation(operation: GitOperation, payload?: Record<string, unknown>) {
    const outcome = await runtime.run(operation, repoPath, payload);
    setResult(outcome);
  }

  return (
    <Card>
      <CardHeader
        title="Git Operations"
        subtitle={
          runtime.kind === "tauri"
            ? "Desktop runtime · executed on the local repository"
            : "Preview runtime · operations require the desktop shell"
        }
        action={
          runtime.kind === "tauri" ? (
            <Badge tone="success">live</Badge>
          ) : (
            <Badge tone="warning">preview</Badge>
          )
        }
      />

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {OPERATIONS.map(({ operation, label }) => (
            <Button
              key={operation}
              size="sm"
              variant="secondary"
              onClick={() => void runOperation(operation)}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextField
              label="Commit message"
              placeholder="Describe the change…"
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
            />
          </div>
          <Button
            size="md"
            variant="primary"
            disabled={messageInput.trim().length === 0}
            onClick={() => {
              void runOperation("commit", { message: messageInput.trim() });
              setMessageInput("");
            }}
          >
            Commit
          </Button>
        </div>

        {result ? (
          <div
            role="status"
            className={`rounded-md border px-3 py-2 text-xs ${
              result.unsupported
                ? "border-warning-500/30 bg-amber-50 text-warning-600"
                : result.ok
                  ? "border-success-500/30 bg-green-50 text-success-600"
                  : "border-danger-500/30 bg-red-50 text-danger-600"
            }`}
          >
            {result.message}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
