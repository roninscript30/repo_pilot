export type StatusTone = "neutral" | "success" | "warning" | "danger" | "accent" | "info";

interface StatusDotProps {
  readonly tone?: StatusTone;
  readonly pulse?: boolean;
  readonly label?: string;
  readonly className?: string;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-surface-400",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  accent: "bg-accent-500",
  info: "bg-info-500",
};

/** Small colored status indicator dot with optional pulse. */
export function StatusDot({ tone = "neutral", pulse = false, label, className = "" }: StatusDotProps) {
  return (
    <span
      aria-label={label}
      className={`relative inline-flex h-2 w-2 shrink-0 rounded-full ${TONE_CLASSES[tone]} ${className}`}
    >
      {pulse ? (
        <span
          aria-hidden="true"
          className={`absolute inset-0 animate-ping rounded-full opacity-60 ${TONE_CLASSES[tone]}`}
        />
      ) : null}
    </span>
  );
}
