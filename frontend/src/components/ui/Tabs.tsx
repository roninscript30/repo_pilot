import { Icon, type IconName } from "./Icon";

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;
  readonly badge?: number;
}

interface TabsProps {
  readonly items: readonly TabItem[];
  readonly activeId: string;
  readonly onChange: (id: string) => void;
  readonly ariaLabel: string;
  readonly size?: "sm" | "md";
}

const SIZE_CLASSES = {
  sm: "text-xs px-2.5 py-1.5 gap-1.5",
  md: "text-sm px-3 py-2 gap-2",
} as const;

/** Tab strip with arrow-key navigation and aria selection semantics. */
export function Tabs({ items, activeId, onChange, ariaLabel, size = "md" }: TabsProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + direction + items.length) % items.length;
    onChange(items[next]?.id ?? activeId);
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex items-center gap-0.5 overflow-x-auto"
    >
      {items.map((item, index) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`inline-flex shrink-0 items-center rounded-md font-medium transition-colors ${
              isActive
                ? "bg-surface-100 text-surface-900 dark:bg-surface-700 dark:text-surface-100"
                : "text-surface-500 hover:bg-surface-100/60 hover:text-surface-800 dark:hover:bg-surface-700/50 dark:hover:text-surface-200"
            } ${SIZE_CLASSES[size]}`}
          >
            {item.icon ? <Icon name={item.icon} size={size === "sm" ? 13 : 15} /> : null}
            {item.label}
            {item.badge !== undefined && item.badge > 0 ? (
              <span
                className={`ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-2xs font-semibold ${
                  isActive
                    ? "bg-accent-500 text-white"
                    : "bg-surface-200 text-surface-600 dark:bg-surface-600 dark:text-surface-300"
                }`}
              >
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
