import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { GraphNode, GraphRef } from "@/domain/models/git";
import { layoutGraph } from "@/features/branches/lib/graph-layout";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/format";

const ROW_HEIGHT = 30;
const LANE_WIDTH = 24;
const TOP_PADDING = 10;
const BOTTOM_PADDING = 14;
const DOT_RADIUS = 4;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;

const LANE_COLORS = [
  "var(--accent-500)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const DEFAULT_CHIP_STYLE = { fill: "var(--surface-400)", text: "var(--surface-900)" };
const CHIP_STYLES: Record<string, { fill: string; text: string }> = {
  head: { fill: "var(--surface-400)", text: "var(--surface-900)" },
  branch: { fill: "var(--accent-600)", text: "var(--white)" },
  remote: { fill: "var(--chart-4)", text: "var(--surface-900)" },
  tag: { fill: "var(--warning-500)", text: "var(--surface-900)" },
};

function laneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length] ?? "var(--accent-500)";
}

function shortId(id: string): string {
  return id.slice(0, 7);
}

interface BranchGraphProps {
  readonly nodes: readonly GraphNode[];
  readonly selectedSha: string | null;
  /** Ref chip clicked (branch/remote/tag decorations). */
  readonly selectedRef: GraphRef | null;
  readonly onSelectCommit: (sha: string) => void;
  readonly onSelectRef: (ref: GraphRef | null) => void;
}

/**
 * Interactive branch graph (GitKraken-style canvas): commit DAG over SVG
 * lanes with merge curves, ref decorations, wheel zoom, drag pan and
 * click-to-select commits and refs.
 */
export function BranchGraph({
  nodes,
  selectedSha,
  selectedRef,
  onSelectCommit,
  onSelectRef,
}: BranchGraphProps) {
  const rows = useMemo(() => layoutGraph(nodes), [nodes]);
  const laneCount = useMemo(() => {
    let max = 0;
    for (const row of rows) max = Math.max(max, row.lane);
    return max + 1;
  }, [rows]);

  const contentWidth = useMemo(() => laneCount * LANE_WIDTH + 360, [laneCount]);
  const contentHeight = useMemo(
    () => TOP_PADDING + rows.length * ROW_HEIGHT + BOTTOM_PADDING,
    [rows.length],
  );
  const xFor = useCallback((lane: number) => lane * LANE_WIDTH + LANE_WIDTH / 2, []);
  const yFor = useCallback((row: number) => TOP_PADDING + row * ROW_HEIGHT + ROW_HEIGHT / 2, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 10, y: 10 });
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  // Wheel zoom must be non-passive to allow preventDefault.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const factor = Math.exp(-event.deltaY * 0.001);
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
      if (nextZoom === zoom) return;
      const ratio = nextZoom / zoom;
      setPan((current) => ({
        x: cursorX - (cursorX - current.x) * ratio,
        y: cursorY - (cursorY - current.y) * ratio,
      }));
      setZoom(nextZoom);
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [zoom]);

  const fit = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const scale = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min((width - 40) / contentWidth, (height - 40) / contentHeight, 1.4)),
    );
    setZoom(scale);
    setPan({
      x: (width - contentWidth * scale) / 2,
      y: (height - contentHeight * scale) / 2,
    });
  }, [contentWidth, contentHeight]);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, moved: false };
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
    setPan((current) => ({ x: current.x + dx, y: current.y + dy }));
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const isSelectedRef = (ref: GraphRef) =>
    selectedRef !== null && selectedRef.kind === ref.kind && selectedRef.name === ref.name;

  return (
    <div className="relative" style={{ height: 440 }}>
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md border border-surface-200 bg-surface-0/90 p-1 shadow-sm dark:border-surface-600 dark:bg-surface-800/90">
        <Button size="sm" variant="ghost" aria-label="Zoom in" onClick={() => {
          const next = Math.min(MAX_ZOOM, zoom * 1.25);
          setZoom(next);
        }}>
          <Icon name="zoomIn" size={13} />
        </Button>
        <Button size="sm" variant="ghost" aria-label="Zoom out" onClick={() => setZoom(Math.max(MIN_ZOOM, zoom / 1.25))}>
          <Icon name="zoomOut" size={13} />
        </Button>
        <Button size="sm" variant="ghost" aria-label="Fit graph" onClick={fit}>
          <Icon name="maximize" size={13} />
        </Button>
      </div>

      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700/60"
      >
        <svg
          className="h-full w-full touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {rows[0]?.laneRows.map((span) => {
              const color = laneColor(span.lane);
              const x = xFor(span.lane);
              const y1 = span.firstRow * ROW_HEIGHT + TOP_PADDING;
              const y2 = (span.lastRow + 1) * ROW_HEIGHT + TOP_PADDING;
              return (
                <line
                  key={span.lane}
                  x1={x}
                  y1={y1}
                  x2={x}
                  y2={y2}
                  stroke={color}
                  strokeWidth={2}
                  strokeOpacity={0.35}
                />
              );
            })}

            {rows.map((row, index) => {
              const y = yFor(index);
              return (
                <g key={row.node.id}>
                  {row.mergeLanes.map((mergeLane) => {
                    const fromX = xFor(mergeLane);
                    const toX = xFor(row.lane);
                    return (
                      <path
                        key={`${mergeLane}-${row.node.id}`}
                        d={`M ${fromX} ${y} C ${fromX} ${y - 8}, ${toX} ${y + 8}, ${toX} ${y}`}
                        stroke={laneColor(mergeLane)}
                        strokeWidth={2}
                        fill="none"
                        strokeOpacity={0.45}
                      />
                    );
                  })}
                </g>
              );
            })}

            {rows.map((row, index) => {
              const y = yFor(index);
              const x = xFor(row.lane);
              const selected = row.node.id === selectedSha;
              const color = laneColor(row.lane);
              return (
                <g key={row.node.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r={DOT_RADIUS + (selected ? 1.5 : 0)}
                    fill={row.node.isMerge ? color : "var(--surface-0)"}
                    stroke={color}
                    strokeWidth={2}
                    className="cursor-pointer"
                    onClick={() => onSelectCommit(row.node.id)}
                  >
                    <title>
                      {`${row.node.subject}\n${row.node.authorName} · ${timeAgo(new Date(row.node.time * 1000).toISOString())}`}
                    </title>
                  </circle>
                  {selected ? (
                    <circle cx={x} cy={y} r={DOT_RADIUS + 6} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.6} />
                  ) : null}
                  <text
                    x={x + 12}
                    y={y + 3.5}
                    fontSize={11}
                    className="cursor-pointer fill-surface-700 dark:fill-surface-300"
                    onClick={() => onSelectCommit(row.node.id)}
                  >
                    {row.node.subject.length > 44 ? `${row.node.subject.slice(0, 44)}…` : row.node.subject}
                  </text>
                  <text x={x + 12} y={y + 15} fontSize={9.5} className="fill-surface-400">
                    {`${shortId(row.node.id)} · ${row.node.authorName} · ${timeAgo(new Date(row.node.time * 1000).toISOString())}`}
                  </text>
                </g>
              );
            })}

            {rows.map((row, index) => {
              const y = yFor(index);
              const refs = row.node.refs;
              if (refs.length === 0) return null;
              return (
                <g key={`refs-${row.node.id}`} transform={`translate(${xFor(row.lane) + 250} ${y - 14})`}>
                  {refs.map((ref, refIndex) => {
                    const style = CHIP_STYLES[ref.kind] ?? DEFAULT_CHIP_STYLE;
                    const width = ref.kind === "head" ? ref.name.length * 6 + 14 : ref.name.length * 6.2 + 16;
                    const selected = isSelectedRef(ref);
                    const isHead = ref.kind === "head";
                    return (
                      <g
                        key={`${ref.kind}-${ref.name}`}
                        transform={`translate(${refIndex * 96} 0)`}
                        className={isHead ? "" : "cursor-pointer"}
                        onClick={() => (isHead ? onSelectRef(null) : onSelectRef(ref))}
                      >
                        <rect
                          x={0}
                          y={0}
                          width={Math.min(width, 92)}
                          height={16}
                          rx={8}
                          fill={selected ? "var(--accent-300)" : style.fill}
                          stroke={selected ? "var(--accent-600)" : "none"}
                          strokeWidth={1}
                        />
                        <text x={8} y={11} fontSize={10} fontWeight={600} fill={style.text}>
                          {ref.name.length > 12 ? `${ref.name.slice(0, 11)}…` : ref.name}
                        </text>
                        <title>{`${ref.kind}: ${ref.name}`}</title>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </svg>
        {rows.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-surface-500">No commit history to graph.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
