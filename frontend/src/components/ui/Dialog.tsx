import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEscapeKey, useFocusTrap } from "@/hooks/use-interactions";
import { Icon } from "./Icon";

interface DialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly size?: "sm" | "md" | "lg";
  readonly showCloseButton?: boolean;
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

/** Modal dialog with backdrop, focus trap, and Escape handling. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  showCloseButton = true,
}: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEscapeKey(onClose, open);
  useFocusTrap(containerRef, open);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-surface-900/40 backdrop-blur-[1px] dark:bg-black/60"
        onClick={onClose}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-description" : undefined}
        className={`relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-xl border border-surface-200 bg-surface-0 shadow-dialog dark:border-surface-600 ${SIZE_CLASSES[size]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-surface-100 px-5 py-4 dark:border-surface-700">
          <div className="min-w-0">
            <h2 id="dialog-title" className="text-sm font-semibold text-surface-900">
              {title}
            </h2>
            {description ? (
              <p id="dialog-description" className="mt-0.5 text-xs text-surface-500">
                {description}
              </p>
            ) : null}
          </div>
          {showCloseButton ? (
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              className="rounded-md p-1 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700"
            >
              <Icon name="x" size={16} />
            </button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-surface-100 px-5 py-3.5 dark:border-surface-700">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
