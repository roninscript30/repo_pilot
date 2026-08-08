import { useMemo } from "react";
import hljs from "highlight.js";

interface SyntaxHighlightProps {
  readonly code: string;
  /** Highlight.js language id; when omitted the language is auto-detected. */
  readonly language?: string | null;
}

/**
 * Syntax-highlighted code block. Kept separate so the diff viewer and the
 * code explorer share one highlight.js path; the highlight.js CSS import
 * lives in `index.css` (github-dark works under both themes).
 */
export function SyntaxHighlight({ code, language = null }: SyntaxHighlightProps) {
  const html = useMemo(() => {
    if (!code) return "";
    try {
      return language ? hljs.highlight(code, { language }).value : hljs.highlightAuto(code).value;
    } catch {
      return code;
    }
  }, [code, language]);
  return <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />;
}
