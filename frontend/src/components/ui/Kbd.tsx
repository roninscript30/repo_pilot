import type { ReactNode } from "react";

interface KbdProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/** Keyboard key chip used in shortcuts and hints. */
export function Kbd({ children, className = "" }: KbdProps) {
  return (
    <kbd
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded border border-surface-300 bg-surface-100 px-1.5 font-mono text-2xs font-medium text-surface-600 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300 ${className}`}
    >
      {children}
    </kbd>
  );
}
