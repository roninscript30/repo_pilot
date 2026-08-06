import { useMemo } from "react";
import type { CommitSummary } from "@/domain/models/commit";
import { assignLanes, laneInfo } from "@/lib/commit-graph";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/format";


const DOT_COLORS = [
  "bg-accent-500",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;

const STROKE_COLORS = [
  "rgb(var(--accent-500))",
  "rgb(var(--chart-2))",
  "rgb(var(--chart-3))",
  "rgb(var(--chart-4))",
  "rgb(var(--chart-5))",
] as const;

function strokeFor(lane: number): string {
  return STROKE_COLORS[lane % STROKE_COLORS.length] ?? "rgb(var(--accent-500))";
}

const COLUMN_WIDTH = 18;

interface CommitGraphProps {
  readonly commits: readonly CommitSummary[];
  readonly selectedSha: string | null;
  readonly onSelect: (sha: string) => void;
}

/** Commit list with branch lanes and merge connectors (GitHub-style). */
export function CommitGraph({ commits, selectedSha, onSelect }: CommitGraphProps) {
  const rows = useMemo(() => assignLanes(commits), [commits]);
  const info = useMemo(() => laneInfo(rows), [rows]);
  const laneCount = info.length;

  return (
    <ul className="divide-y divide-surface-100 dark:divide-surface-700/60">
      {rows.map((row, index) => {
        const { commit, lane, mergeLanes } = row;
        const isSelected = commit.sha === selectedSha;
        const laneColor = DOT_COLORS[lane % DOT_COLORS.length] ?? "bg-accent-500";
        const rowY = 15; // vertical center of the row

        return (
          <li key={commit.sha}>
            <button
              type="button"
              onClick={() => onSelect(commit.sha)}
              className={`flex w-full items-stretch gap-2 px-2 py-1.5 text-left transition-colors ${
                isSelected
                  ? "bg-accent-100/70 dark:bg-accent-100/15"
                  : "hover:bg-surface-50 dark:hover:bg-surface-700/40"
              }`}
            >
              <span
                aria-hidden="true"
                className="relative shrink-0 self-stretch"
                style={{ width: `${laneCount * COLUMN_WIDTH}px` }}
              >
                {/* Column lines + connectors */}
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${laneCount * COLUMN_WIDTH} ${28}`}
                  preserveAspectRatio="none"
                >
                  {info.map((laneInfoItem, laneIndex) => {
                    const x = laneIndex * COLUMN_WIDTH + COLUMN_WIDTH / 2;
                    const hasLine = index >= laneInfoItem.firstRow && index <= laneInfoItem.lastRow;
                    if (!hasLine) return null;
                    return (
                      <line
                        key={laneIndex}
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={28}
                        stroke={strokeFor(laneIndex)}
                        strokeWidth={2}
                        strokeOpacity={0.45}
                      />
                    );
                  })}
                  {mergeLanes.map((mergeLane) => {
                    const fromX = mergeLane * COLUMN_WIDTH + COLUMN_WIDTH / 2;
                    const toX = lane * COLUMN_WIDTH + COLUMN_WIDTH / 2;
                    return (
                      <path
                        key={`${mergeLane}-${commit.sha}`}
                        d={`M ${fromX} ${rowY} C ${fromX} ${rowY - 7}, ${toX} ${rowY + 7}, ${toX} ${rowY}`}
                        stroke={strokeFor(mergeLane)}
                        strokeWidth={2}
                        fill="none"
                        strokeOpacity={0.45}
                      />
                    );
                  })}
                </svg>
                {/* Dot */}
                <span
                  className={`absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-surface-0 shadow-sm dark:border-surface-50 ${laneColor}`}
                  style={{
                    left: `${lane * COLUMN_WIDTH + COLUMN_WIDTH / 2 - 4}px`,
                    width: 9,
                    height: 9,
                  }}
                />
              </span>

              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Avatar name={commit.author.name} src={commit.author.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-surface-800 dark:text-surface-200">
                    {commit.subject}
                  </span>
                  <span className="block truncate text-2xs text-surface-400">
                    {commit.author.name} · {commit.committedAt ? timeAgo(commit.committedAt) : "unknown time"}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[11px] text-surface-400">{commit.shortSha}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
