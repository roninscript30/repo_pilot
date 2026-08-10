import { useRepositoryActivity } from "@/features/repo/hooks";
import { timeAgo } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const KIND_ICON: Record<string, { icon: "gitPush" | "gitPull" | "issue" | "rocket" | "gitFork" | "star" | "message" | "activity"; className: string }> = {
  push: { icon: "gitPush", className: "text-success-600 dark:text-success-500" },
  pull_request: { icon: "gitPull", className: "text-accent-600 dark:text-accent-500" },
  issue: { icon: "issue", className: "text-warning-600 dark:text-warning-500" },
  release: { icon: "rocket", className: "text-info-600 dark:text-info-500" },
  fork: { icon: "gitFork", className: "text-surface-500" },
  watch: { icon: "star", className: "text-warning-600 dark:text-warning-500" },
  comment: { icon: "message", className: "text-info-600 dark:text-info-500" },
  other: { icon: "activity", className: "text-surface-500" },
};

interface ActivityFeedProps {
  readonly fullName: string;
}

/** Repository activity feed: pushes, PRs, issues, releases and more. */
export function ActivityFeed({ fullName }: ActivityFeedProps) {
  const events = useRepositoryActivity(fullName);

  if (events.isLoading) {
    return (
      <div className="flex justify-center py-14">
        <Spinner label="Loading activity…" size="sm" />
      </div>
    );
  }

  if (events.isError) {
    return (
      <ErrorState
        title="Could not load activity"
        description={events.error instanceof Error ? events.error.message : "The activity feed is unavailable."}
        onRetry={() => void events.refetch()}
      />
    );
  }

  const items = events.data ?? [];

  return (
    <Card>
      <CardHeader
        title="Activity"
        subtitle="Recent events in this repository"
        action={<span className="text-2xs text-surface-400">{items.length} events</span>}
      />
      {items.length === 0 ? (
        <div className="p-4">
          <EmptyState title="No activity yet" description="Events will appear here as the repository gets used." />
        </div>
      ) : (
        <ul className="max-h-[70vh] divide-y divide-surface-100 overflow-y-auto dark:divide-surface-800">
          {items.map((event) => {
            const meta = KIND_ICON[event.kind] ?? KIND_ICON.other!;
            return (
              <li key={event.id} className="flex items-start gap-3 px-4 py-2.5">
                <Avatar name={event.actor.login} src={event.actor.avatarUrl} size="xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-xs font-semibold text-surface-800 dark:text-surface-200">
                      {event.actor.login}
                    </span>
                    <Icon name={meta.icon} size={12} className={meta.className} />
                    <span className="ml-auto shrink-0 text-2xs text-surface-400">
                      {timeAgo(event.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-surface-600 dark:text-surface-400">
                    {event.description}
                  </p>
                  {event.url ? (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1 inline-flex items-center gap-1 text-2xs text-accent-600 hover:underline dark:text-accent-400"
                    >
                      Open on GitHub <Icon name="external" size={10} />
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
