import type { ReactNode } from "react";

interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-surface-200 bg-surface-50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-surface-700">{title}</p>
      {description ? <p className="max-w-sm text-xs text-surface-500">{description}</p> : null}
      {action}
    </div>
  );
}
