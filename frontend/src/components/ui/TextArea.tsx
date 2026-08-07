import type { TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly label?: string;
  readonly hint?: string;
  readonly error?: string;
}

/** Multi-line text input with label, hint, and error support. */
export function TextArea({ label, hint, error, className = "", id, ...rest }: TextAreaProps) {
  const inputId = id ?? (label ? `field-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-xs font-medium text-surface-700 dark:text-surface-300">
          {label}
        </label>
      ) : null}
      <textarea
        id={inputId}
        className={`min-h-20 rounded-md border border-surface-200 bg-surface-0 px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-accent-500 focus:outline-2 focus:outline-accent-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 ${error ? "border-danger-500" : ""} ${className}`}
        {...rest}
      />
      {error ? <p className="text-xs text-danger-600">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-surface-500">{hint}</p> : null}
    </div>
  );
}
