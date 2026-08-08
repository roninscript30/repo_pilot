import hljs from "highlight.js";

/** Extends a filename's extension to a highlight.js language id (null when unknown). */
export function languageForFile(filename: string): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot < 0 || dot === filename.length - 1) return null;
  const ext = filename.slice(dot + 1).toLowerCase();
  try {
    return hljs.getLanguage(ext) ? ext : null;
  } catch {
    return null;
  }
}
