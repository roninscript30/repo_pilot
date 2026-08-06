import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "./Icon";
import { ToastContext } from "./toast-context";

export type ToastTone = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  readonly title: string;
  readonly description?: string;
  readonly tone?: ToastTone;
  readonly durationMs?: number;
}

interface Toast extends ToastOptions {
  readonly id: number;
}

const TONE_STYLES: Record<ToastTone, { icon: IconName; ring: string; iconColor: string }> = {
  success: { icon: "checkCircle", ring: "border-success-500/40", iconColor: "text-success-600 dark:text-success-500" },
  error: { icon: "alertCircle", ring: "border-danger-500/40", iconColor: "text-danger-600 dark:text-danger-500" },
  info: { icon: "info", ring: "border-info-500/40", iconColor: "text-info-600 dark:text-info-500" },
  warning: { icon: "alertCircle", ring: "border-warning-500/40", iconColor: "text-warning-600 dark:text-warning-500" },
};

/** Toast provider; renders an accessible, auto-dismissing notification queue. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const nextIdRef = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;
      setToasts((current) => [...current, { ...options, tone: options.tone ?? "info", id }]);
      const duration = options.durationMs ?? 5000;
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          aria-atomic="false"
          className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2"
        >
          {toasts.map((item) => {
            const tone = TONE_STYLES[item.tone ?? "info"];
            return (
              <div
                key={item.id}
                role="status"
                className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-surface-0 px-3.5 py-3 shadow-pop dark:bg-surface-800 ${tone.ring}`}
              >
                <Icon name={tone.icon} size={16} className={`mt-0.5 ${tone.iconColor}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{item.title}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-xs text-surface-500">{item.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(item.id)}
                  className="rounded p-0.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700"
                >
                  <Icon name="x" size={13} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
