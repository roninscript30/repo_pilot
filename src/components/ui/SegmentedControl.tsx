import { Icon, type IconName } from "./Icon";

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: IconName;
}

interface SegmentedControlProps<T extends string> {
  readonly options: readonly SegmentedOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly ariaLabel: string;
  readonly size?: "sm" | "md";
}

/** Single-select segmented control (view mode, state filters, diff mode). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "sm",
}: SegmentedControlProps<T>) {
  const sizeClass = size === "sm" ? "h-7 px-2 text-xs gap-1" : "h-9 px-3 text-sm gap-1.5";
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-md border border-surface-200 bg-surface-100/60 p-0.5 dark:border-surface-600 dark:bg-surface-800"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center rounded border font-medium transition-colors ${sizeClass} ${
              isActive
                ? "border-surface-200 bg-surface-0 text-surface-900 shadow-card dark:border-surface-500 dark:bg-surface-700 dark:text-surface-100"
                : "border-transparent text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200"
            }`}
          >
            {option.icon ? <Icon name={option.icon} size={size === "sm" ? 13 : 15} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
