import { Icon, type IconName } from "@/components/ui/Icon";

export interface RepoActivityRailItem {
  readonly id: string;
  readonly icon: IconName;
  readonly label: string;
  /** Optional count shown as a badge on the rail button. */
  readonly badge?: number | null;
}

interface RepoActivityRailProps {
  readonly items: readonly RepoActivityRailItem[];
  readonly activeId: string;
  readonly onSelect: (id: string) => void;
}

/**
 * Vertical activity rail of the repository workspace, styled after the
 * VS Code activity bar. Each button is an engineering surface of the
 * repository document.
 */
export function RepoActivityRail({ items, activeId, onSelect }: RepoActivityRailProps) {
  return (
    <nav
      aria-label="Repository activities"
      className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-surface-200 bg-surface-0 py-2 dark:border-surface-700 dark:bg-surface-50"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            onClick={() => onSelect(item.id)}
            className={`relative flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              active
                ? "bg-accent-50 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300"
                : "text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700/60 dark:hover:text-surface-200"
            }`}
          >
            <Icon name={item.icon} size={16} />
            {item.badge != null && item.badge > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent-500 px-0.5 text-[9px] font-bold leading-none text-white">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
