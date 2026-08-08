import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import hljs from "highlight.js";
import { parseUnifiedDiff } from "@/lib/diff";
import type { DiffHunk, DiffLine } from "@/domain/models/git";
import { wordDiff } from "@/lib/word-diff";
import { Icon, type IconName } from "@/components/ui/Icon";
import { MarkdownView } from "@/components/markdown/MarkdownView";
import { languageForFile } from "@/features/git/lib/language";

type DiffMode = "unified" | "split" | "word";
type LineKind = DiffLine["kind"];

const MODE_ICON: Record<DiffMode, IconName> = {
  unified: "rows",
  split: "grid",
  word: "zap",
};

const LINE_CLASSES: Record<LineKind, string> = {
  context: "bg-transparent",
  add: "bg-success-100/60 dark:bg-success-50/15",
  remove: "bg-danger-100/60 dark:bg-danger-50/15",
};

const TEXT_CLASSES: Record<LineKind, string> = {
  context: "text-surface-600 dark:text-surface-300",
  add: "text-success-700 dark:text-success-600",
  remove: "text-danger-700 dark:text-danger-600",
};

/** Stronger highlight for the exact characters that changed in word mode. */
const WORD_CHANGED_CLASSES: Record<"add" | "remove", string> = {
  add: "rounded bg-success-300/50 font-medium dark:bg-success-400/30",
  remove: "rounded bg-danger-300/40 font-medium dark:bg-danger-400/25",
};

const STATUS_META: Record<DiffChange["status"], { icon: IconName; label: string }> = {
  added: { icon: "plus", label: "added" },
  removed: { icon: "trash", label: "removed" },
  renamed: { icon: "gitCompare", label: "renamed" },
  modified: { icon: "pencil", label: "modified" },
};

interface DiffChange {
  readonly filename: string;
  readonly status: "added" | "modified" | "removed" | "renamed";
  readonly additions: number;
  readonly deletions: number;
}

interface DiffViewerProps {
  readonly change: DiffChange;
  /** Unified diff patch; when null the change is rendered without a body. */
  readonly patch: string | null;
  /** Structured hunks from the backend; preferred over parsing the patch. */
  readonly hunks?: readonly DiffHunk[];
  readonly binary?: boolean;
}

/** Per-file diff block: header with stats plus a mode-aware diff body. */
export function DiffViewer({ change, patch, hunks, binary = false }: DiffViewerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedHunks, setCollapsedHunks] = useState<ReadonlySet<number>>(new Set());
  const [mode, setMode] = useState<DiffMode>("unified");
  const [preview, setPreview] = useState(false);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const meta = STATUS_META[change.status];

  const resolved = useMemo(() => resolveHunks(hunks, patch), [hunks, patch]);

  const stats = useMemo(() => {
    if (resolved.length === 0) return { additions: change.additions, deletions: change.deletions };
    let additions = 0;
    let deletions = 0;
    for (const hunk of resolved) {
      for (const line of hunk.lines) {
        if (line.kind === "add") additions += 1;
        if (line.kind === "remove") deletions += 1;
      }
    }
    return { additions, deletions };
  }, [resolved, change]);

  const changeCount = useMemo(
    () =>
      resolved.reduce(
        (sum, hunk) => sum + hunk.lines.filter((line) => line.kind !== "context").length,
        0,
      ),
    [resolved],
  );

  const language = useMemo(() => languageForFile(change.filename), [change.filename]);
  const totalLines = useMemo(() => resolved.reduce((sum, hunk) => sum + hunk.lines.length, 0), [resolved]);
  const highlight = language !== null && totalLines <= 800;
  const isMarkdown = change.filename.toLowerCase().endsWith(".md");

  // Reconstructed new-side text of the changed regions (markdown preview).
  const previewMarkdown = useMemo(() => {
    if (!preview || !isMarkdown) return "";
    const parts = resolved.flatMap((hunk) =>
      hunk.lines.filter((line) => line.kind !== "remove").map((line) => line.text),
    );
    return parts.length > 0 ? `${parts.join("\n")}\n` : "";
  }, [preview, isMarkdown, resolved]);

  // Jump navigation: scroll the focused changed line into view.
  useEffect(() => {
    if (focusIndex === null || focusIndex < 0) return;
    const el = bodyRef.current?.querySelector(`[data-change-index="${focusIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [focusIndex, mode, preview, collapsed, collapsedHunks]);

  function moveFocus(delta: number) {
    if (changeCount === 0) return;
    const next = focusIndex === null ? (delta > 0 ? 0 : changeCount - 1) : focusIndex + delta;
    setFocusIndex(((next % changeCount) + changeCount) % changeCount);
  }

  function toggleHunk(index: number) {
    const next = new Set(collapsedHunks);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setCollapsedHunks(next);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-surface-200 bg-surface-0 shadow-card dark:border-surface-600 dark:bg-surface-50">
      <div className="flex items-center gap-2.5 border-b border-surface-100 px-3 py-2 dark:border-surface-700/60">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={!collapsed}
        >
          <Icon
            name="chevronRight"
            size={13}
            className={`shrink-0 text-surface-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
          />
          <Icon name={meta.icon} size={14} className="shrink-0 text-surface-400" />
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-surface-700 dark:text-surface-300">
            {change.filename}
          </span>
          <span className="shrink-0 font-mono text-[11px]">
            <span className="text-success-700 dark:text-success-600">+{stats.additions}</span>
            <span className="mx-1 text-surface-300">/</span>
            <span className="text-danger-700 dark:text-danger-600">−{stats.deletions}</span>
          </span>
          <span className="shrink-0 rounded bg-surface-100 px-1.5 py-0.5 text-2xs text-surface-500 dark:bg-surface-700">
            {meta.label}
          </span>
        </button>

        {changeCount > 0 ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => moveFocus(-1)}
              aria-label="Previous change"
              className="rounded p-1 text-surface-500 hover:bg-surface-100 hover:text-surface-800 dark:hover:bg-surface-700"
            >
              <Icon name="chevronLeft" size={14} />
            </button>
            <button
              type="button"
              onClick={() => moveFocus(1)}
              aria-label="Next change"
              className="rounded p-1 text-surface-500 hover:bg-surface-100 hover:text-surface-800 dark:hover:bg-surface-700"
            >
              <Icon name="chevronRight" size={14} />
            </button>
          </div>
        ) : null}

        <div className="flex shrink-0 items-center gap-0.5" aria-label="Diff mode">
          {(Object.keys(MODE_ICON) as DiffMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item);
                setPreview(false);
              }}
              aria-label={`${item} diff`}
              aria-pressed={mode === item}
              className={`rounded p-1.5 ${
                mode === item
                  ? "bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-400"
                  : "text-surface-500 hover:bg-surface-100 hover:text-surface-800 dark:hover:bg-surface-700"
              }`}
            >
              <Icon name={MODE_ICON[item]} size={13} />
            </button>
          ))}
        </div>

        {isMarkdown && changeCount > 0 ? (
          <button
            type="button"
            onClick={() => setPreview((value) => !value)}
            aria-label="Toggle markdown preview"
            aria-pressed={preview}
            className={`rounded p-1.5 ${
              preview
                ? "bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-400"
                : "text-surface-500 hover:bg-surface-100 hover:text-surface-800 dark:hover:bg-surface-700"
            }`}
          >
            <Icon name="eye" size={13} />
          </button>
        ) : null}
      </div>

      {!collapsed ? (
        <div ref={bodyRef} className="overflow-x-auto">
          {binary ? (
            <p className="px-4 py-6 text-center text-xs text-surface-500">
              Binary file — content is not diffed.
            </p>
          ) : resolved.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-surface-500">
              {patch === null || patch === ""
                ? "Diff body unavailable for this change."
                : "No textual changes."}
            </p>
          ) : preview && isMarkdown ? (
            <div className="px-4 py-3">
              <MarkdownView markdown={previewMarkdown} />
            </div>
          ) : (
            resolved.map((hunk, index) => {
              const isCollapsed = collapsedHunks.has(index);
              return (
                <div key={index} className="code-canvas">
                  <button
                    type="button"
                    onClick={() => toggleHunk(index)}
                    aria-expanded={!isCollapsed}
                    className="flex w-full items-center gap-2 border-b border-surface-100 bg-surface-50 px-3 py-1 font-mono text-[11px] text-surface-400 hover:bg-surface-100 dark:border-surface-700/60 dark:bg-surface-800/50 dark:hover:bg-surface-800"
                  >
                    <Icon
                      name="chevronRight"
                      size={11}
                      className={`transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                    />
                    <span>
                      @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                    </span>
                    <span className="ml-auto text-2xs text-surface-400">
                      {hunk.lines.filter((line) => line.kind !== "context").length} changed
                    </span>
                  </button>
                  {!isCollapsed ? (
                    mode === "split" ? (
                      <SplitHunk
                        hunk={hunk}
                        highlight={highlight}
                        language={language}
                        changeIndexBase={changeStartIndex(resolved, index)}
                      />
                    ) : (
                      <UnifiedHunk
                        hunk={hunk}
                        highlight={highlight}
                        language={language}
                        word={mode === "word"}
                        changeIndexBase={changeStartIndex(resolved, index)}
                      />
                    )
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Domain-shaped hunks from props, falling back to parsing the patch. */
function resolveHunks(
  hunks: readonly DiffHunk[] | undefined,
  patch: string | null,
): readonly DiffHunk[] {
  if (hunks && hunks.length > 0) return hunks;
  if (!patch) return [];
  return parseUnifiedDiff(patch).map((hunk) => ({
    oldStart: hunk.oldStart,
    oldLines: hunk.oldLines,
    newStart: hunk.newStart,
    newLines: hunk.newLines,
    lines: hunk.lines.map((line) => ({
      kind: line.type,
      oldNo: line.oldLine,
      newNo: line.newLine,
      text: line.text,
    })),
  }));
}

/** Number of changed lines before hunk `index` (global change numbering). */
function changeStartIndex(hunks: readonly DiffHunk[], index: number): number {
  let count = 0;
  for (let i = 0; i < index; i += 1) {
    const hunk = hunks[i];
    if (hunk) count += hunk.lines.filter((line) => line.kind !== "context").length;
  }
  return count;
}

const CELL_BASE = "flex min-w-max px-0 text-[13px] leading-relaxed";
const NO_BASE =
  "w-8 shrink-0 select-none border-r border-surface-100 px-1.5 text-right font-mono text-[11px] leading-relaxed text-surface-300 dark:border-surface-700/60 dark:text-surface-600";
const SIGN_BASE = "w-6 shrink-0 select-none";

function UnifiedHunk({
  hunk,
  highlight,
  language,
  word,
  changeIndexBase,
}: {
  hunk: DiffHunk;
  highlight: boolean;
  language: string | null;
  word: boolean;
  changeIndexBase: number;
}) {
  let oldCursor = hunk.oldStart;
  let newCursor = hunk.newStart;
  let changeCursor = changeIndexBase;
  const pendingRemoves: DiffLine[] = [];
  const rows: ReactNode[] = [];

  for (const line of hunk.lines) {
    const isAdd = line.kind === "add";
    const isRemove = line.kind === "remove";
    if (isRemove && word) pendingRemoves.push(line);
    const changeIndex = isAdd || isRemove ? changeCursor : null;
    if (isAdd || isRemove) changeCursor += 1;

    rows.push(
      <div
        key={rows.length}
        data-change-index={changeIndex ?? undefined}
        className={`${CELL_BASE} ${LINE_CLASSES[line.kind]}`}
      >
        <span
          aria-hidden="true"
          className={`${NO_BASE} ${isAdd ? "" : isRemove ? "bg-danger-100/40 dark:bg-danger-50/10" : ""}`}
        >
          {isAdd ? "" : oldCursor}
        </span>
        <span
          aria-hidden="true"
          className={`${NO_BASE} ${isRemove ? "" : isAdd ? "bg-success-100/40 dark:bg-success-50/10" : ""}`}
        >
          {isRemove ? "" : newCursor}
        </span>
        <span aria-hidden="true" className={`${SIGN_BASE} ${TEXT_CLASSES[line.kind]}`}>
          {isAdd ? "+" : isRemove ? "−" : ""}
        </span>
        <span className={`flex-1 whitespace-pre pl-2 ${TEXT_CLASSES[line.kind]}`}>
          {line.kind === "add" && word
            ? renderWordAdd(line, pendingRemoves, highlight, language)
            : renderLineText(line.text, highlight, language)}
        </span>
      </div>,
    );
    if (!isAdd) oldCursor += 1;
    if (!isRemove) newCursor += 1;
  }
  return <>{rows}</>;
}

/** Word-mode: pair an added line with the removed line that replaced it. */
function renderWordAdd(
  line: DiffLine,
  pendingRemoves: DiffLine[],
  highlight: boolean,
  language: string | null,
): ReactNode {
  const pair = pendingRemoves.shift();
  if (!pair) return renderLineText(line.text, highlight, language);
  const segments = wordDiff(pair.text, line.text);
  return (
    <>
      {segments.map((segment, index) => (
        <span
          key={index}
          className={segment.kind === "add" ? WORD_CHANGED_CLASSES.add : undefined}
        >
          {segment.text}
        </span>
      ))}
    </>
  );
}

/** Render line text, optionally syntax-highlighted for known languages. */
function renderLineText(text: string, highlight: boolean, language: string | null): ReactNode {
  if (!highlight) return text || " ";
  return <Highlighted text={text} language={language} />;
}

function Highlighted({ text, language }: { text: string; language: string | null }) {
  const html = useMemo(() => {
    if (!text) return " ";
    try {
      return language ? hljs.highlight(text, { language }).value : hljs.highlightAuto(text).value;
    } catch {
      return text;
    }
  }, [text, language]);
  return <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />;
}

function SplitHunk({
  hunk,
  highlight,
  language,
  changeIndexBase,
}: {
  hunk: DiffHunk;
  highlight: boolean;
  language: string | null;
  changeIndexBase: number;
}) {
  let oldCursor = hunk.oldStart;
  let newCursor = hunk.newStart;
  let changeCursor = changeIndexBase;
  const left: ReactNode[] = [];
  const right: ReactNode[] = [];

  for (const line of hunk.lines) {
    const isAdd = line.kind === "add";
    const isRemove = line.kind === "remove";
    const changeIndex = isAdd || isRemove ? changeCursor : null;
    if (isAdd || isRemove) changeCursor += 1;

    const text = renderLineText(line.text, highlight, language);
    if (line.kind === "context") {
      left.push(
        <SplitCell kind="context" side="left" old={oldCursor} new={newCursor} text={text} changeIndex={changeIndex} />,
      );
      right.push(
        <SplitCell kind="context" side="right" old={oldCursor} new={newCursor} text={text} changeIndex={changeIndex} />,
      );
      oldCursor += 1;
      newCursor += 1;
    } else if (isRemove) {
      left.push(
        <SplitCell kind="remove" side="left" old={oldCursor} new={null} text={text} changeIndex={changeIndex} />,
      );
      right.push(<SplitCell kind="remove" side="right" old={null} new={null} text={null} changeIndex={null} />);
      oldCursor += 1;
    } else {
      left.push(<SplitCell kind="add" side="left" old={null} new={null} text={null} changeIndex={null} />);
      right.push(
        <SplitCell kind="add" side="right" old={null} new={newCursor} text={text} changeIndex={changeIndex} />,
      );
      newCursor += 1;
    }
  }

  return (
    <>
      {left.map((cell, index) => (
        <div key={index} className={CELL_BASE}>
          {cell}
          {right[index]}
        </div>
      ))}
    </>
  );
}

function SplitCell({
  kind,
  side,
  old,
  new: newNo,
  text,
  changeIndex,
}: {
  kind: LineKind;
  side: "left" | "right";
  old: number | null;
  new: number | null;
  text: ReactNode | null;
  changeIndex: number | null;
}) {
  const empty = text === null;
  const isLeft = side === "left";
  return (
    <>
      <span
        aria-hidden="true"
        className={`${NO_BASE} ${!empty && kind === "remove" ? "bg-danger-100/40 dark:bg-danger-50/10" : ""}`}
      >
        {old ?? ""}
      </span>
      <span
        aria-hidden="true"
        className={`${NO_BASE} ${!empty && kind === "add" ? "bg-success-100/40 dark:bg-success-50/10" : ""}`}
      >
        {newNo ?? ""}
      </span>
      <span
        data-change-index={changeIndex ?? undefined}
        className={`flex-1 whitespace-pre pl-2 ${LINE_CLASSES[kind]} ${
          isLeft ? "border-r border-surface-100 dark:border-surface-700/60" : ""
        } ${empty ? "text-transparent" : TEXT_CLASSES[kind]}`}
      >
        {empty ? "·" : text}
      </span>
    </>
  );
}
