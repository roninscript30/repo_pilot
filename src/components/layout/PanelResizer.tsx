import { useCallback, useRef, useState } from "react";

interface PanelResizerProps {
  readonly orientation: "vertical" | "horizontal";
  /** Sets the panel size in px while dragging. */
  readonly onResize: (deltaPx: number) => void;
  readonly ariaLabel: string;
}

/**
 * Thin draggable bar between resizable panels. Reports signed deltas;
 * the caller clamps and persists the final size.
 */
export function PanelResizer({ orientation, onResize, ariaLabel }: PanelResizerProps) {
  const [dragging, setDragging] = useState(false);
  const lastPositionRef = useRef(0);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      setDragging(true);
      lastPositionRef.current = orientation === "vertical" ? event.clientX : event.clientY;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [orientation],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragging) return;
      const current = orientation === "vertical" ? event.clientX : event.clientY;
      const delta = current - lastPositionRef.current;
      lastPositionRef.current = current;
      onResize(delta);
    },
    [dragging, onResize, orientation],
  );

  const stopDragging = useCallback(() => setDragging(false), []);

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation={orientation === "vertical" ? "vertical" : "horizontal"}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onResize(orientation === "vertical" ? -10 : 0);
        if (event.key === "ArrowRight") onResize(orientation === "vertical" ? 10 : 0);
        if (event.key === "ArrowUp") onResize(orientation === "horizontal" ? -10 : 0);
        if (event.key === "ArrowDown") onResize(orientation === "horizontal" ? 10 : 0);
      }}
      className={`group relative z-10 shrink-0 bg-surface-200/60 transition-colors dark:bg-surface-700/50 ${
        orientation === "vertical" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"
      } ${
        dragging
          ? "bg-accent-500/70"
          : "hover:bg-accent-500/40"
      }`}
    >
      <span className={`absolute ${orientation === "vertical" ? "inset-y-0 -left-0.5 w-1.5" : "inset-x-0 -top-0.5 h-1.5"}`} />
    </div>
  );
}
