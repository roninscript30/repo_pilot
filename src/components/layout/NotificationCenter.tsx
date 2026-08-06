import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { useNotifications } from "@/hooks/use-account";
import { NOTIFICATION_REASON_LABELS } from "@/domain/models/notification";
import { Popover } from "@/components/ui/Popover";
import { Icon } from "@/components/ui/Icon";
import { SkeletonText } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/format";
import { useUiStore } from "@/stores/ui-store";

function reasonLabel(reason: string): string {
  return NOTIFICATION_REASON_LABELS[reason] ?? reason;
}

/** Bell trigger + notifications panel (provider-backed, actionable). */
export function NotificationCenter() {
  const open = useUiStore((state) => state.notificationsOpen);
  const setOpen = useUiStore((state) => state.setNotificationsOpen);
  const account = useAuthStore((state) => state.account);
  const notifications = useNotifications(30, account !== null);

  const unreadCount = notifications.data?.filter((item) => item.isUnread).length ?? 0;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="bottom-end"
      role="dialog"
      className="w-96"
      trigger={
        <span
          role="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-surface-100 dark:hover:bg-surface-700"
        >
          <Icon name="bell" size={18} className="text-surface-400 dark:text-surface-500" />
          {unreadCount > 0 ? (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-2xs font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </span>
      }
    >
      <div className="flex items-center justify-between border-b border-surface-100 px-3 py-2.5 dark:border-surface-700">
        <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Notifications</h3>
        <span className="text-2xs text-surface-400">
          {unreadCount > 0 ? `${unreadCount} unread` : "all read"}
        </span>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.isLoading ? (
          <div className="space-y-2.5 p-3">
            <SkeletonText className="h-4 w-full" />
            <SkeletonText className="h-4 w-4/5" />
            <SkeletonText className="h-4 w-3/5" />
          </div>
        ) : notifications.error ? (
          <div className="p-3">
            <EmptyState
              title="Notifications unavailable"
              description="The token may need the 'notifications' permission."
            />
          </div>
        ) : notifications.data && notifications.data.length > 0 ? (
          <ul className="divide-y divide-surface-100 dark:divide-surface-700">
            {notifications.data.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/repositories/${item.repositoryFullName}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-surface-50 dark:hover:bg-surface-700/60"
                >
                  {item.isUnread ? (
                    <span aria-label="Unread" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500" />
                  ) : (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-surface-300 dark:border-surface-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] leading-snug font-medium text-surface-800 dark:text-surface-200">
                      {item.subjectTitle}
                    </p>
                    <p className="mt-0.5 truncate text-2xs text-surface-400">
                      {item.repositoryFullName} · {reasonLabel(item.reason)} · {timeAgo(item.updatedAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-3">
            <EmptyState title="You're all caught up" description="No unread notifications right now." />
          </div>
        )}
      </div>

      <div className="border-t border-surface-100 px-3 py-2 text-2xs text-surface-400 dark:border-surface-700">
        Notifications refresh automatically every 5 minutes.
      </div>
    </Popover>
  );
}
