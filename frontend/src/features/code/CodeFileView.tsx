import { useMemo, useState } from "react";
import hljs from "highlight.js";
import { useFileContent } from "@/features/code/hooks";
import { MarkdownView } from "@/components/markdown/MarkdownView";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/toast-context";
import { fileExtension, formatBytes } from "@/lib/files";

const EXTENSION_LANGUAGE: Readonly<Record<string, string>> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  md: "markdown",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  cc: "cpp",
  cs: "csharp",
  php: "php",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  ini: "ini",
  conf: "ini",
  css: "css",
  scss: "scss",
  html: "xml",
  xml: "xml",
  vue: "xml",
  sql: "sql",
  dockerfile: "dockerfile",
  makefile: "makefile",
  lua: "lua",
  pl: "perl",
  r: "r",
  dart: "dart",
  elm: "elm",
  erl: "erlang",
  ex: "elixir",
  exs: "elixir",
  hs: "haskell",
  m: "objectivec",
  mm: "objectivec",
  vb: "vbnet",
  vbs: "vbscript",
  ps1: "powershell",
  scala: "scala",
  tex: "latex",
  proto: "protobuf",
  graphql: "graphql",
  gql: "graphql",
  prism: "prisma",
};

function languageForPath(path: string): string | undefined {
  const extension = fileExtension(path).toLowerCase();
  const name = extension === "dockerfile" ? "dockerfile" : undefined;
  if (name) return name;
  if (extension) return EXTENSION_LANGUAGE[extension];
  const basename = path.split("/").pop()?.toLowerCase() ?? "";
  if (basename === "dockerfile") return "dockerfile";
  if (basename === "makefile") return "makefile";
  return undefined;
}

function isMarkdownPath(path: string): boolean {
  const extension = fileExtension(path).toLowerCase();
  const basename = path.split("/").pop()?.toLowerCase() ?? "";
  return extension === "md" || extension === "markdown" || basename === "readme";
}

interface CodeFileViewProps {
  readonly fullName: string;
  readonly path: string;
  readonly ref: string;
}

/** Single-file viewer: syntax-highlighted code or rendered markdown. */
export function CodeFileView({ fullName, path, ref }: CodeFileViewProps) {
  const { toast } = useToast();
  const content = useFileContent(fullName, path, ref);
  const [wrap, setWrap] = useState(false);

  const text = content.data?.content ?? null;
  const language = useMemo(() => languageForPath(path), [path]);

  const highlighted = useMemo(() => {
    if (text === null) return null;
    try {
      return language ? hljs.highlight(text, { language }).value : hljs.highlightAuto(text).value;
    } catch {
      return null;
    }
  }, [text, language]);

  const lineCount = useMemo(() => (text === null ? 0 : text.split("\n").length), [text]);

  if (content.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={`Loading ${path}…`} />
      </div>
    );
  }

  if (content.isError) {
    return (
      <Card className="m-4 p-6 text-center">
        <p className="text-sm font-medium text-surface-800 dark:text-surface-200">Could not load file</p>
        <p className="mt-1 text-xs text-surface-500">
          {content.error instanceof Error ? content.error.message : "The file may be binary or too large."}
        </p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => void content.refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (text === null) {
    return (
      <Card className="m-4 p-6 text-center">
        <p className="text-sm text-surface-500">This file has no text content (binary or too large).</p>
      </Card>
    );
  }

  if (isMarkdownPath(path)) {
    return (
      <Card className="m-4">
        <div className="p-5">
          <MarkdownView markdown={text} />
        </div>
      </Card>
    );
  }

  const lines = text.split("\n");

  return (
    <Card className="m-4 overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-surface-200 px-3 py-2 dark:border-surface-700">
        <span className="truncate font-mono text-xs text-surface-600 dark:text-surface-300">{path}</span>
        <span className="text-2xs text-surface-400">
          {lineCount} lines · {formatBytes(content.data?.size ?? 0)} · {language ?? "plain text"}
        </span>
        <span className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setWrap((value) => !value)}
          aria-pressed={wrap}
          title="Toggle word wrap"
        >
          <Icon name="maximize" size={13} />
          Wrap
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void navigator.clipboard.writeText(text);
            toast({ title: "File copied", description: path, tone: "success" });
          }}
          title="Copy file contents"
        >
          <Icon name="copy" size={13} />
          Copy
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = path.split("/").pop() ?? path;
            anchor.click();
            URL.revokeObjectURL(url);
          }}
          title="Download file"
        >
          <Icon name="download" size={13} />
        </Button>
      </div>
      <div className={`code-canvas overflow-x-auto ${wrap ? "overflow-x-hidden" : ""}`}>
        <div className="flex min-w-max">
          <div aria-hidden="true" className="select-none border-r border-surface-200 px-3 py-3 text-right font-mono text-[13px] leading-relaxed text-surface-300 dark:border-surface-700 dark:text-surface-600">
            {lines.map((_, index) => (
              <div key={index}>{index + 1}</div>
            ))}
          </div>
          <pre className={`px-4 py-3 text-surface-200 dark:text-surface-100 ${wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"}`}>
            {highlighted ? (
              <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
            ) : (
              <code>{text}</code>
            )}
          </pre>
        </div>
      </div>
    </Card>
  );
}
