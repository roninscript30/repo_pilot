import { useCallback, useEffect, useState, type CSSProperties, type RefObject } from "react";

export type Placement =
  | "bottom-start"
  | "bottom-end"
  | "top-start"
  | "top-end"
  | "right-start";

interface Position {
  readonly top: number;
  readonly left: number;
}

/**
 * Compute a fixed-position rect for a popover anchored to an element.
 * Clamps inside the viewport with a small margin.
 */
export function computePopoverPosition(
  anchor: HTMLElement,
  panel: HTMLElement,
  placement: Placement,
  gap = 6,
): Position {
  const anchorRect = anchor.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const margin = 8;

  let top = anchorRect.bottom + gap;
  let left = anchorRect.left;

  if (placement.startsWith("top")) {
    top = anchorRect.top - panelRect.height - gap;
  }
  if (placement.endsWith("-start")) {
    left = anchorRect.left;
  } else {
    left = anchorRect.right - panelRect.width;
  }
  if (placement === "right-start") {
    left = anchorRect.right + gap;
    top = anchorRect.top;
  }

  left = Math.max(margin, Math.min(left, window.innerWidth - panelRect.width - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - panelRect.height - margin));
  return { top, left };
}

/**
 * Positions a portal-rendered panel relative to an anchor element,
 * recomputing on scroll/resize so the panel tracks the anchor.
 */
export function useAnchoredPosition(
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  placement: Placement,
  active: boolean,
) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const { top, left } = computePopoverPosition(anchor, panel, placement);
    setStyle({ position: "fixed", top, left, zIndex: 50 });
  }, [anchorRef, panelRef, placement]);

  useEffect(() => {
    if (!active) return;
    update();
    // Defer one frame so the panel has painted with real dimensions.
    const frame = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, update]);

  return { style, update };
}
