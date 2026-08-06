import { useMemo } from "react";
import { normalizeHex, readableColor } from "@/lib/color";

interface TagProps {
  readonly label: string;
  /** Hex color from the provider (e.g. issue labels). */
  readonly color?: string;
  readonly className?: string;
}

/** Colored label chip (provider-colored when a hex color is provided). */
export function Tag({ label, color, className = "" }: TagProps) {
  const background = useMemo(() => (color ? normalizeHex(color) : null), [color]);

  if (!background) {
    return (
      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium text-surface-600 dark:text-surface-300 ${className}`}>
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-semibold ${className}`}
      style={{ backgroundColor: background, color: readableColor(background) }}
    >
      {label}
    </span>
  );
}