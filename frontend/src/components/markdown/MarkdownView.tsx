import { useMemo } from "react";
import { marked, type RendererObject } from "marked";
import hljs from "highlight.js";

/**
 * Markdown renderer for repository documents (READMEs, release notes).
 *
 * Safety strategy: input HTML is escaped before parsing so raw tags render
 * as text (marked only produces tags from markdown syntax itself), and
 * generated link/image hrefs are restricted to safe protocols. Code blocks
 * are syntax-highlighted with highlight.js.
 */

const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"] as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapes raw HTML outside fenced code blocks. */
function escapeRawHtml(markdown: string): string {
  const lines = markdown.split("\n");
  let inFence = false;
  const escaped = lines.map((line) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return line;
    }
    return inFence ? line : escapeHtml(line);
  });
  return escaped.join("\n");
}

function isSafeHref(href: string): boolean {
  try {
    const url = new URL(href, "https://github.com/");
    return SAFE_PROTOCOLS.some((protocol) => url.protocol === protocol);
  } catch {
    return false;
  }
}

function highlightCode(code: string, language: string | undefined): string {
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(code, { language }).value;
  }
  return hljs.highlightAuto(code).value;
}

const renderer: RendererObject = {
  link({ href, title, tokens }) {
    const text = tokens.map((token) => token.raw).join("");
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    if (!href || !isSafeHref(href)) {
      return `<span class="text-surface-500">${text}</span>`;
    }
    return `<a href="${escapeHtml(href)}"${titleAttr} target="_blank" rel="noreferrer noopener" class="text-accent-600 underline underline-offset-2 hover:text-accent-700 dark:text-accent-500 dark:hover:text-accent-400">${text}</a>`;
  },

  image({ href, title, text }) {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    if (!href || !isSafeHref(href)) {
      return `<span class="text-surface-500">${escapeHtml(text)}</span>`;
    }
    return `<img src="${escapeHtml(href)}"${titleAttr} alt="${escapeHtml(text)}" class="my-2 max-w-full rounded-md" loading="lazy" />`;
  },

  code({ text, lang }) {
    const language = lang || undefined;
    let highlighted = escapeHtml(text);
    try {
      highlighted = highlightCode(text, language);
    } catch {
      // fall back to escaped plain text
    }
    const langClass = language ? `hljs language-${escapeHtml(language)}` : "hljs";
    const label = language ? escapeHtml(language) : "";
    return `<div class="code-block group"><div class="flex items-center justify-between rounded-t-md border border-b-0 border-surface-200/70 bg-surface-100/80 px-3 py-1 dark:border-surface-600/70 dark:bg-surface-800"><span class="text-2xs text-surface-400">${label}</span></div><pre class="code-canvas"><code class="${langClass}">${highlighted}</code></pre></div>`;
  },
};

marked.use({ renderer });

function renderMarkdown(markdown: string): string {
  const prepared = escapeRawHtml(markdown);
  return marked.parse(prepared, { breaks: true, gfm: true }) as string;
}

interface MarkdownViewProps {
  readonly markdown: string;
  readonly className?: string;
}

/** Renders markdown as styled, syntax-highlighted, sanitized HTML. */
export function MarkdownView({ markdown, className = "" }: MarkdownViewProps) {
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);
  return <div className={`markdown-body ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
