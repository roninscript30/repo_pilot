import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/toast-context";
import { useLocalReposStore } from "@/features/local/store";
import { pickFolder } from "@/services/dialog";
import { isTauriRuntime } from "@/services/runtime";
import { formatDate } from "@/lib/format";
import type { Repository } from "@/domain/models/repository";

interface RepoSettingsViewProps {
  readonly repository: Repository;
  readonly localPath: string | null;
}

/**
 * Repository-level settings: identity facts plus the local working tree
 * link that powers the Git-engine activities.
 */
export function RepoSettingsView({ repository, localPath }: RepoSettingsViewProps) {
  const { toast } = useToast();
  const repositories = useLocalReposStore((state) => state.repositories);
  const link = useLocalReposStore((state) => state.link);
  const [picking, setPicking] = useState(false);

  const tracked = localPath
    ? repositories.find((entry) => entry.path === localPath) ?? null
    : null;

  async function pickAndLink() {
    setPicking(true);
    try {
      const path = await pickFolder();
      if (path) {
        link(path, repository.fullName);
        toast({ title: "Local copy linked", description: path, tone: "success" });
      }
    } finally {
      setPicking(false);
    }
  }

  return (
    <div className="grid min-h-[480px] max-w-3xl grid-cols-1 items-start gap-4 px-6 py-5">
      <Card>
        <CardHeader title="Repository" subtitle={repository.fullName} />
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-xs">
          <Setting label="Default branch" value={repository.defaultBranch ?? "—"} />
          <Setting label="Language" value={repository.language ?? "—"} />
          <Setting
            label="Visibility"
            value={repository.isPrivate ? "private" : "public"}
          />
          <Setting label="Open issues" value={String(repository.openIssues)} />
          <Setting label="Stars" value={String(repository.stars)} />
          <Setting label="Forks" value={String(repository.forks)} />
          <Setting label="Created" value={formatDate(repository.createdAt)} />
          <Setting label="Last updated" value={formatDate(repository.updatedAt)} />
        </dl>
      </Card>

      <Card>
        <CardHeader
          title="Local copy"
          subtitle="Powers the Working Tree, Branches, Sync and Compare activities"
        />
        <div className="space-y-3 p-4">
          {localPath ? (
            <>
              <p className="flex items-start gap-2 text-xs text-surface-700 dark:text-surface-300">
                <Icon name="checkCircle" size={13} className="mt-0.5 shrink-0 text-success-600" />
                <span className="min-w-0">
                  <span className="block font-medium">Linked working tree</span>
                  <code className="mt-1 block truncate rounded bg-surface-100 px-1.5 py-0.5 text-2xs text-surface-500 dark:bg-surface-700">
                    {localPath}
                  </code>
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={tracked?.pinned ? "accent" : "neutral"}>
                  {tracked?.pinned ? "pinned" : "not pinned"}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    link(localPath, null);
                    toast({ title: "Local copy unlinked" });
                  }}
                >
                  Unlink
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-surface-500">
                No local working tree is linked. Link a folder to unlock the
                Git engine for this repository.
              </p>
              <Button
                size="sm"
                variant="secondary"
                disabled={picking}
                onClick={() => void pickAndLink()}
              >
                <Icon name={picking ? "refresh" : "folder"} size={13} />
                {picking ? "Opening picker…" : isTauriRuntime() ? "Pick folder" : "Pick a folder"}
              </Button>
              {isTauriRuntime() ? null : (
                <p className="text-2xs text-surface-400">
                  Browser preview has no native dialog; Git operations stay
                  simulated-safe (ADR-0006).
                </p>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-wide text-surface-400">{label}</dt>
      <dd className="mt-0.5 text-surface-800 dark:text-surface-200">{value}</dd>
    </div>
  );
}
