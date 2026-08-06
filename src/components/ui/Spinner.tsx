interface SpinnerProps {
  readonly label?: string;
  readonly size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "h-3.5 w-3.5 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-[3px]",
} as const;

export function Spinner({ label, size = "md" }: SpinnerProps) {
  return (
    <div className="flex items-center gap-2 text-surface-500">
      <span
        role="status"
        aria-label={label ?? "Loading"}
        className={`inline-block animate-spin rounded-full border-surface-200 border-t-accent-600 ${SIZE_CLASSES[size]}`}
      />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}
