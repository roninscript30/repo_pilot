import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/toast-context";
import { useLocalReposStore } from "@/features/local/store";
import { pickFolder } from "@/services/dialog";
import { isTauriRuntime } from "@/services/runtime";

interface LocalRepoGateProps {
  readonly fullName: string;
  /** Rendered with the linked local working tree path when one exists. */
  readonly children: (path: string) => ReactNode;
}

/**
 * Gate for Git-engine activities: they need a linked local working tree.
 *
 * When the repository has no local copy yet, an open-state is shown with
 * a native folder picker (desktop) or a pointer to the Local Repos
 * surface (browser preview). Linking is a preference-only side effect;
 * nothing is written to disk beyond the tracked path (ADR-0006).
 */
export function LocalRepoGate({ fullName, children }: LocalRepoGateProps) {
  const repositories = useLocalReposStore((state) => state.repositories);
  const add = useLocalReposStore((state) => state.add);
  const [picking, setPicking] = useState(false);
  const { toast } = useToast();

  const entry = repositories.find((candidate) => candidate.fullName === fullName);
  if (entry) return <>{children(entry.path)}</>;

  async function pickAndLink() {
    setPicking(true);
    try {
      const path = await pickFolder();
      if (path) {
        add(path, fullName);
        toast({ title: "Local copy linked", description: path, tone: "success" });
      }
    } finally {
      setPicking(false);
    }
  }

  return (
    <div className="flex min-h-[480px] items-start justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <EmptyState
          title="Open a local copy"
          description="Working Tree, Branches, Sync and Compare run on a local Git working tree. Link a folder to this repository to enable the Git engine."
          action={
            <div className="flex flex-col items-center gap-2">
              <Button size="sm" variant="primary" onClick={() => void pickAndLink()} disabled={picking}>
                <Icon name={picking ? "refresh" : "folder"} size={13} />
                {picking ? "Opening picker…" : isTauriRuntime() ? "Pick folder" : "Pick a folder"}
              </Button>
              {isTauriRuntime() ? null : (
                <p className="text-2xs text-surface-400">
                  Browser preview has no native dialog.{" "}
                  <Link to="/local" className="text-accent-600 hover:underline dark:text-accent-400">
                    Manage local repos
                  </Link>
                  .
                </p>
              )}
              <Link
                to="/local"
                className="text-xs text-accent-600 hover:underline dark:text-accent-400"
              >
                Browse tracked local repos
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}
