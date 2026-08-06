import { useRef, useState, type ReactNode } from "react";
import { Popover } from "./Popover";
import type { Placement } from "@/hooks/use-anchored-position";

interface HoverCardProps {
  readonly trigger: ReactNode;
  readonly children: ReactNode;
  readonly placement?: Placement;
  readonly delayMs?: number;
  readonly className?: string;
}

/**
 * Rich preview card that appears after a hover delay (GitHub-style).
 * Used for repository previews and user hover cards.
 */
export function HoverCard({
  trigger,
  children,
  placement = "bottom-start",
  delayMs = 300,
  className = "",
}: HoverCardProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [suppress, setSuppress] = useState(false);

  function scheduleShow() {
    if (timerRef.current !== null) return;
    timerRef.current = window.setTimeout(() => {
      setOpen(true);
      setSuppress(false);
    }, delayMs);
  }

  function cancel() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function hide() {
    cancel();
    setOpen(false);
    // Prevent immediate re-trigger when the cursor crosses the gap.
    setSuppress(true);
    window.setTimeout(() => setSuppress(false), 100);
  }

  return (
    <span
      onMouseEnter={() => !suppress && scheduleShow()}
      onMouseLeave={hide}
      onFocus={scheduleShow}
      onBlur={hide}
    >
      <Popover
        open={open}
        onOpenChange={setOpen}
        placement={placement}
        role="dialog"
        closeOnOutside={false}
        className={`p-0 ${className}`}
        trigger={trigger}
      >
        <div onMouseEnter={cancel} onMouseLeave={hide}>
          {children}
        </div>
      </Popover>
    </span>
  );
}
