import { useRef, useState, type ReactNode } from "react";
import { Popover } from "./Popover";
import type { Placement } from "@/hooks/use-anchored-position";

interface TooltipProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly placement?: Placement;
  readonly delayMs?: number;
  readonly className?: string;
}

/**
 * Accessible hover tooltip. Shows after a short delay so it never
 * interferes with fast mouse movement; keyboard focus shows it too.
 */
export function Tooltip({
  label,
  children,
  placement = "top-start",
  delayMs = 400,
  className = "",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  function show() {
    if (timerRef.current !== null) return;
    timerRef.current = window.setTimeout(() => setVisible(true), delayMs);
  }

  function hide() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }

  return (
    <span onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <Popover
        open={visible}
        onOpenChange={setVisible}
        placement={placement}
        role="tooltip"
        closeOnOutside={false}
        className={`pointer-events-none border-none bg-surface-800 px-2 py-1 text-xs font-medium text-surface-100 shadow-pop dark:bg-surface-200 dark:text-surface-800 ${className}`}
        trigger={children}
      >
        {label}
      </Popover>
    </span>
  );
}
