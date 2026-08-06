import { useParams } from "react-router-dom";
import { useRepositoryOverview } from "@/hooks/use-repositories";
import { usePullRequests, useReleases } from "@/hooks/use-collaboration";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Kbd } from "@/components/ui/Kbd";
import { StatusDot } from "@/components/ui/StatusDot";
import { SkeletonText } from "@/components/ui/Skeleton";
import { compactNumber } from "@/lib/format";

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-surface-100 px-3.5 py-3 dark:border-surface-700">
      <h3 className="text-2xs font-semibold tracking-wide text-surface-400 uppercase">{title}</h3>
      <div className="mt-2 space-y-1.5">{children}</div>
    </section>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-surface-400">{icon}</span>
      <span className="flex-1 text-surface-500 dark:text-surface-400">{label}</span>
      <span className="font-medium text-surface-800 dark:text-surface-200">{value}</span>
    </div>
  );
}

/** Right-side context panel: repository intelligence or account summary. */
export function ContextPanel() {
  const { fullName = "" } = useParams<{ fullName: string }>();
  const account = useAuthStore((state) => state.account);
  const overview = useRepositoryOverview(fullName, fullName.length > 0);
  const pulls = usePullRequests(fullName, "open", fullName.length > 0);
  const releases = useReleases(fullName, fullName.length > 0);

  if (!fullName) {
    return (
      <aside aria-label="Context" className="flex h-full w-full flex-col overflow-y-auto bg-surface-0">
        <div className="border-b border-surface-100 px-3.5 py-3 dark:border-surface-700">
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Context</h2>
          <p className="mt-0.5 text-xs text-surface-500">
            Open a repository to see its context here.
          </p>
        </div>
        <PanelSection title="Account">
          <div className="flex items-center gap-2">
            <Avatar name={account?.displayName ?? "?"} src={account?.avatarUrl ?? null} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-surface-800 dark:text-surface-200">
                {account?.displayName ?? "Signed out"}
              </p>
              <p className="truncate text-2xs text-surface-500">@{account?.login ?? "—"}</p>
            </div>
          </div>
        </PanelSection>
        <PanelSection title="Shortcuts">
          {[
            ["Open command palette", "⌘K"],
            ["Global search", "⌘P"],
            ["Search repositories", "/"],
            ["Toggle context panel", "⌘]"],
          ].map(([label, keys]) => (
            <div key={label} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-surface-500 dark:text-surface-400">{label}</span>
              <Kbd>{keys}</Kbd>
            </div>
          ))}
        </PanelSection>
        <PanelSection title="Provider">
          <div className="flex items-center gap-2 text-xs">
            <StatusDot tone="success" label="GitHub connected" />
            <span className="text-surface-600 dark:text-surface-300">GitHub API</span>
          </div>
        </PanelSection>
      </aside>
    );
  }

  const repository = overview.data?.repository;

  return (
    <aside aria-label="Repository context" className="flex h-full w-full flex-col overflow-y-auto bg-surface-0">
      <div className="border-b border-surface-100 px-3.5 py-3 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <Avatar name={repository?.owner.login ?? fullName} src={repository?.owner.avatarUrl ?? null} size="sm" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
              {repository?.name ?? fullName.split("/")[1] ?? fullName}
            </h2>
            <p className="truncate text-2xs text-surface-500">{repository?.fullName ?? fullName}</p>
          </div>
          {repository ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-surface-100 px-2 py-0.5 text-2xs font-medium text-surface-600 dark:bg-surface-700 dark:text-surface-300">
              <Icon name={repository.isPrivate ? "lock" : "globe"} size={10} />
              {repository.isPrivate ? "Private" : "Public"}
            </span>
          ) : null}
        </div>
      </div>

      {overview.isLoading ? (
        <div className="space-y-2 p-4">
          <SkeletonText className="h-4 w-full" />
          <SkeletonText className="h-4 w-3/4" />
          <SkeletonText className="h-4 w-1/2" />
        </div>
      ) : repository ? (
        <>
          <PanelSection title="Signals">
            <StatRow icon={<Icon name="gitBranch" size={12} />} label="Default branch" value={repository.defaultBranch ?? "—"} />
            <StatRow icon={<Icon name="star" size={12} />} label="Stars" value={compactNumber(repository.stars)} />
            <StatRow icon={<Icon name="gitFork" size={12} />} label="Forks" value={compactNumber(repository.forks)} />
            <StatRow icon={<Icon name="gitMerge" size={12} />} label="Open PRs" value={String(pulls.data?.length ?? 0)} />
            <StatRow icon={<Icon name="issue" size={12} />} label="Open issues" value={compactNumber(repository.openIssues)} />
            <StatRow
              icon={<Icon name="rocket" size={12} />}
              label="Latest release"
              value={releases.data?.[0]?.tagName ?? "—"}
            />
          </PanelSection>

          {overview.data?.languages && overview.data.languages.size > 0 ? (
            <PanelSection title="Languages">
              {[...overview.data.languages.entries()]
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([language, bytes]) => {
                  const total = [...(overview.data?.languages?.values() ?? [])].reduce((sum, value) => sum + value, 0) || 1;
                  return (
                    <div key={language} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 truncate text-surface-600 dark:text-surface-300">{language}</span>
                      <span className="text-2xs text-surface-400">{Math.round((bytes / total) * 100)}%</span>
                    </div>
                  );
                })}
            </PanelSection>
          ) : null}
        </>
      ) : null}
    </aside>
  );
}
