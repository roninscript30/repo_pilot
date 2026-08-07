import type { ReactNode } from "react";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "accent";

interface BadgeProps {
  readonly tone?: BadgeTone;
  readonly children: ReactNode;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-surface-100 text-surface-600",
  success: "bg-green-50 text-success-600",
  warning: "bg-amber-50 text-warning-600",
  danger: "bg-red-50 text-danger-600",
  accent: "bg-accent-50 text-accent-700",
};

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
