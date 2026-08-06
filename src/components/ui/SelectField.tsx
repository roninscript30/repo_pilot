import type { SelectHTMLAttributes } from "react";
import { Icon } from "./Icon";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly label?: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
}

/** Styled native select with label; native popup keeps accessibility free. */
export function SelectField({ label, options, className = "", id, ...rest }: SelectFieldProps) {
  const inputId = id ?? (label ? `field-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-2xs font-medium text-surface-500 dark:text-surface-400">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={inputId}
          className={`h-8 w-full appearance-none rounded-md border border-surface-200 bg-surface-0 pr-8 pl-2.5 text-xs text-surface-800 focus:border-accent-500 focus:outline-2 focus:outline-accent-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200 ${className}`}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevronDown"
          size={13}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400"
        />
      </div>
    </div>
  );
}
