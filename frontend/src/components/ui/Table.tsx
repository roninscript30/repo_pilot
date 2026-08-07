import type { ReactNode, ThHTMLAttributes } from "react";

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-surface-200 dark:border-surface-600">{children}</tr>
    </thead>
  );
}

interface THProps extends ThHTMLAttributes<HTMLTableCellElement> {
  readonly children?: ReactNode;
}

export function TH({ children, className = "", ...rest }: THProps) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400 ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

export function TR({ children, className = "", onClick, ...rest }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-surface-100 dark:border-surface-700 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function TD({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-middle text-surface-700 dark:text-surface-200 ${className}`}>{children}</td>;
}
