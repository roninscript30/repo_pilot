import type { InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly hint?: ReactNode;
  readonly ariaLabel?: string;
  readonly autoFocus?: boolean;
}

/** Search field with leading icon, clear button, and optional kbd hint. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  hint,
  ariaLabel = "Search",
  autoFocus,
  ...rest
}: SearchInputProps) {
  return (
    <div className="relative">
      <Icon
        name="search"
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
      />
      <input
        type="search"
        role="searchbox"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-surface-200 bg-surface-0 pr-16 pl-9 text-sm text-surface-900 placeholder:text-surface-400 focus:border-accent-500 focus:outline-2 focus:outline-accent-500/20 dark:border-surface-600 dark:bg-surface-800"
        {...rest}
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange("")}
            className="rounded p-0.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700"
          >
            <Icon name="x" size={13} />
          </button>
        ) : null}
        {hint ?? null}
      </div>
    </div>
  );
}
