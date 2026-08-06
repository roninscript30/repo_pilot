/** Contrasting text color for a given background hex (WCAG-aware). */
export function readableColor(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return "#ffffff";
  const value = match[1] ?? "";
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1f2937" : "#ffffff";
}

/** Normalize a provider hex to #rrggbb or null when malformed. */
export function normalizeHex(hex: string): string | null {
  if (!/^#?[0-9a-f]{6}$/i.test(hex.trim())) return null;
  return `#${hex.trim().replace(/^#/, "")}`;
}
