import { useState } from "react";
import { useReleases } from "@/hooks/use-releases";
import { formatBytes } from "@/lib/files";
import { timeAgo, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { MarkdownView } from "@/components/markdown/MarkdownView";

interface ReleasesTabProps {
  readonly fullName: string;
}

/** Releases workspace: tag list with notes and assets. */
export function ReleasesTab({ fullName }: ReleasesTabProps) {
  const [expandedTag, setExpandedTag] = useState<string | null>(null);
  const releases = useReleases(fullName);

  if (releases.isLoading) {
    return (
      <div className="flex justify-center py-14">
        <Spinner label="Loading releases…" size="sm" />
      </div>
    );
  }

  if (releases.isError) {
    return (
      <ErrorState
        title="Could not load releases"
        description={releases.error instanceof Error ? releases.error.message : "Releases may require additional scopes."}
        onRetry={() => void releases.refetch()}
      />
    );
  }

  const data = releases.data ?? [];

  if (data.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No releases yet"
          description="This repository has not published any releases."
        />
      </Card>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      {data.map((release) => {
        const expanded = expandedTag === release.tagName;
        const latest = data[0]?.tagName === release.tagName && !release.isPrerelease;
        return (
          <Card key={release.id}>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Icon name="rocket" size={14} className="text-accent-600 dark:text-accent-500" />
                <h2 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  {release.name ?? release.tagName}
                </h2>
                <span className="font-mono text-2xs text-surface-400">{release.tagName}</span>
                {latest ? <Badge tone="success">latest</Badge> : null}
                {release.isPrerelease ? <Badge tone="warning">pre-release</Badge> : null}
                {release.isDraft ? <Badge tone="neutral">draft</Badge> : null}
                <button
                  type="button"
                  onClick={() => setExpandedTag(expanded ? null : release.tagName)}
                  className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700"
                  aria-expanded={expanded}
                >
                  <Icon
                    name="chevronRight"
                    size={12}
                    className={`transition-transform ${expanded ? "rotate-90" : ""}`}
                  />
                  {expanded ? "Collapse" : "Expand"}
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-surface-400">
                <span className="inline-flex items-center gap-1">
                  <Avatar name={release.author.login} src={release.author.avatarUrl} size="xs" />
                  {release.author.login}
                </span>
                <span>
                  {release.publishedAt ? `published ${timeAgo(release.publishedAt)} · ${formatDate(release.publishedAt)}` : "draft"}
                </span>
                {release.assets.length > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="download" size={11} /> {release.assets.length} assets
                  </span>
                ) : null}
              </div>

              {expanded ? (
                <div className="mt-3 border-t border-surface-100 pt-3 dark:border-surface-700/60">
                  {release.body ? (
                    <MarkdownView markdown={release.body} />
                  ) : (
                    <p className="text-xs text-surface-500">No release notes provided.</p>
                  )}
                  {release.assets.length > 0 ? (
                    <div className="mt-4">
                      <p className="mb-1.5 text-2xs font-semibold tracking-wide text-surface-400 uppercase">Assets</p>
                      <ul className="divide-y divide-surface-100 rounded-md border border-surface-200 dark:divide-surface-700/60 dark:border-surface-600">
                        {release.assets.map((asset) => (
                          <li key={asset.name} className="flex items-center gap-2.5 px-3 py-2">
                            <Icon name="file" size={13} className="text-surface-400" />
                            <span className="min-w-0 flex-1 truncate font-mono text-xs text-surface-700 dark:text-surface-300">
                              {asset.name}
                            </span>
                            <span className="shrink-0 text-2xs text-surface-400">
                              {formatBytes(asset.size)} · {asset.downloadCount} downloads
                            </span>
                            <a
                              href={asset.downloadUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-surface-200 px-2 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-700"
                            >
                              <Icon name="download" size={13} />
                              Download
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
