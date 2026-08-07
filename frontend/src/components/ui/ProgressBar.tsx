interface ProgressBarProps {
  readonly value: number;
  readonly max?: number;
  readonly tone?: "accent" | "success" | "warning" | "danger";
  readonly className?: string;
}

const TONE_CLASSES = {
  accent: "bg-accent-500",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
} as const;

/** Determinate progress bar. */
export function ProgressBar({ value, max = 100, tone = "accent", className = "" }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={`h-1.5 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700 ${className}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-300 ${TONE_CLASSES[tone]}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
