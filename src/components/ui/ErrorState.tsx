import type { ReactNode } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";

interface ErrorStateProps {
  readonly title?: string;
  readonly description?: string;
  readonly onRetry?: () => void;
  readonly children?: ReactNode;
}

/** Standard error state with retry action. */
export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  children,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-danger-500/30 bg-danger-50/60 px-6 py-10 text-center dark:bg-danger-50/10"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-danger-100 text-danger-600 dark:bg-danger-100/20">
        <Icon name="alertCircle" size={18} />
      </span>
      <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{title}</p>
      {description ? <p className="max-w-sm text-xs text-surface-500">{description}</p> : null}
      {children}
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry} className="mt-1">
          Retry
        </Button>
      ) : null}
    </div>
  );
}
