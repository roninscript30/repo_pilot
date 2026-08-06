/** Lowercase extension without the dot; "" for dotfiles or paths without one. */
export function fileExtension(path: string): string {
  const basename = path.split("/").pop() ?? "";
  if (basename.startsWith(".") || basename === "") return "";
  const dot = basename.lastIndexOf(".");
  if (dot <= 0 || dot === basename.length - 1) return "";
  return basename.slice(dot + 1);
}

/** Human-readable byte size, e.g. "2.4 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"] as const;
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex += 1;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value >= 100 ? Math.round(value) : Math.round(value * 10) / 10} ${units[unitIndex]}`;
}
