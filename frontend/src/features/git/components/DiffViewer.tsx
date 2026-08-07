import { useMemo, useState } from "react";
import { diffStats, parseUnifiedDiff, type DiffHunk, type DiffLine } from "@/lib/diff";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { FileChangeDetail } from "@/domain/models/code";

const LINE_CLASSES: Record<DiffLine["type"], string> = {
  context: "bg-transparent",
  add: "bg-success-100/60 dark:bg-success-50/15",
  remove: "bg-danger-100/60 dark:bg-danger-50/15",
};

const TEXT_CLASSES: Record<DiffLine["type"], string> = {
  context: "text-surface-600 dark:text-surface-300",
  add: "text-success-700 dark:text-success-600",
  remove: "text-danger-700 dark:text-danger-600",
};

const STATUS_META: Record<FileChangeDetail["status"], { icon: IconName; label: string; tone: "success" | "danger" | "accent" | "warning" }> = {
  added: { icon: "plus", label: "added", tone: "success" },
  removed: { icon: "trash", label: "removed", tone: "danger" },
  renamed: { icon: "gitCompare", label: "renamed", tone: "accent" },
  modified: { icon: "pencil", label: "modified", tone: "warning" },
};

const STATUS_ICON_CLASSES: Record<FileChangeDetail["status"], string> = {
  added: "text-success-600 dark:text-success-500",
  removed: "text-danger-600 dark:text-danger-500",
  renamed: "text-accent-600 dark:text-accent-500",
  modified: "text-warning-600 dark:text-warning-500",
};

const STATUS_BADGE_CLASSES: Record<FileChangeDetail["status"], string> = {
  added: "bg-success-100 text-success-700 dark:bg-success-50/15 dark:text-success-600",
  removed: "bg-danger-100 text-danger-700 dark:bg-danger-50/15 dark:text-danger-600",
  renamed: "bg-accent-100 text-accent-700 dark:bg-accent-100/20 dark:text-accent-500",
  modified: "bg-warning-100 text-warning-700 dark:bg-warning-50/15 dark:text-warning-600",
};

function HunkView({ hunk }: { hunk: DiffHunk }) {
  const oldStart = hunk.oldStart;
  const newStart = hunk.newStart;
  let oldCursor = oldStart;
  let newCursor = newStart;

  return (
    <div className="code-canvas border-b border-surface-100 last:border-b-0 dark:border-surface-700/60">
      <div className="flex items-center gap-2 border-b border-surface-100 bg-surface-50 px-3 py-1 font-mono text-[11px] text-surface-400 dark:border-surface-700/60 dark:bg-surface-800/50">
        <Icon name="gitCommit" size={11} />
        <span>@@ -{oldStart},{hunk.oldLines} +{newStart},{hunk.newLines} @@</span>
      </div>
      {hunk.lines.map((line, index) => {
        const isAdd = line.type === "add";
        const isRemove = line.type === "remove";
        return (
          <div
            key={index}
            className={`flex min-w-max px-0 text-[13px] leading-relaxed ${LINE_CLASSES[line.type]}`}
          >
            <span
              aria-hidden="true"
              className={`w-8 shrink-0 select-none border-r border-surface-100 px-1.5 text-right font-mono text-[11px] leading-relaxed text-surface-300 dark:border-surface-700/60 dark:text-surface-600 ${
                isAdd ? "" : isRemove ? "bg-danger-100/40 dark:bg-danger-50/10" : ""
              }`}
            >
              {isAdd ? "" : oldCursor}
            </span>
            <span
              aria-hidden="true"
              className={`w-8 shrink-0 select-none border-r border-surface-100 px-1.5 text-right font-mono text-[11px] leading-relaxed text-surface-300 dark:border-surface-700/60 dark:text-surface-600 ${
                isRemove ? "" : isAdd ? "bg-success-100/40 dark:bg-success-50/10" : ""
              }`}
            >
              {isRemove ? "" : newCursor}
            </span>
            <span
              aria-hidden="true"
              className={`w-6 shrink-0 select-none text-center ${isAdd ? "text-success-600 dark:text-success-500" : isRemove ? "text-danger-600 dark:text-danger-500" : "text-surface-300 dark:text-surface-600"}`}
            >
              {isAdd ? "+" : isRemove ? "−" : ""}
            </span>
            <span className={`flex-1 whitespace-pre pl-2 ${TEXT_CLASSES[line.type]}`}>{line.text || " "}</span>
            {!isAdd ? oldCursor += 1 : null}
            {!isRemove ? newCursor += 1 : null}
          </div>
        );
      })}
    </div>
  );
}

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
}

/** Per-file diff block: header with stats plus unified hunks. */
export function DiffViewer({ change, patch }: DiffViewerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const meta = STATUS_META[change.status];

  const hunks = useMemo(() => (patch ? parseUnifiedDiff(patch) : []), [patch]);
  const stats = useMemo(() => (patch ? diffStats(hunks) : { additions: change.additions, deletions: change.deletions }), [patch, hunks, change]);

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
          <Icon name={meta.icon} size={13} className={`shrink-0 ${STATUS_ICON_CLASSES[change.status]}`} />
          <span className="truncate font-mono text-[13px] font-medium text-surface-800 dark:text-surface-200">
            {change.filename}
          </span>
          <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-2xs font-medium ${STATUS_BADGE_CLASSES[change.status]}`}>
            {meta.label}
          </span>
        </button>
        <span className="shrink-0 font-mono text-xs">
          <span className="text-success-700 dark:text-success-600">+{stats.additions}</span>
          <span className="mx-1 text-surface-300">/</span>
          <span className="text-danger-700 dark:text-danger-600">−{stats.deletions}</span>
        </span>
      </div>
      {!collapsed && patch ? (
        <div className="overflow-x-auto">
          {hunks.map((hunk, index) => <HunkView key={index} hunk={hunk} />)}
        </div>
      ) : !collapsed && !patch ? (
        <p className="px-3 py-3 text-xs text-surface-500">Diff body unavailable for this change.</p>
      ) : null}
    </div>
  );
}
