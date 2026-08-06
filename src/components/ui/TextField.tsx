import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string;
  readonly hint?: string;
  readonly error?: string;
}

export function TextField({ label, hint, error, className = "", id, ...rest }: TextFieldProps) {
  const inputId = id ?? (label ? `field-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-xs font-medium text-surface-700 dark:text-surface-300">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`h-9 rounded-md border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 placeholder:text-surface-400 focus:border-accent-500 focus:outline-2 focus:outline-accent-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-500 ${error ? "border-danger-500 dark:border-danger-500" : ""} ${className}`}
        {...rest}
      />
      {error ? <p className="text-xs text-danger-600 dark:text-danger-500">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-surface-500 dark:text-surface-400">{hint}</p> : null}
    </div>
  );
}
