import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-surface-200 bg-surface-0 shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-surface-100 px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-surface-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-surface-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
