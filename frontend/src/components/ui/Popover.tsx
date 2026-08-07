import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPosition, type Placement } from "@/hooks/use-anchored-position";
import { useClickOutside, useEscapeKey } from "@/hooks/use-interactions";

interface PopoverProps {
  readonly trigger: ReactNode;
  readonly children: ReactNode;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly placement?: Placement;
  readonly className?: string;
  readonly role?: "menu" | "dialog" | "tooltip" | "listbox";
  readonly labelledBy?: string;
  readonly closeOnOutside?: boolean;
}

/**
 * Portal-rendered popover anchored to a trigger element.
 * Shared primitive for menus, tooltips, hover cards, and select popups.
 */
export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  placement = "bottom-start",
  className = "",
  role = "menu",
  labelledBy,
  closeOnOutside = true,
}: PopoverProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { style } = useAnchoredPosition(triggerRef, panelRef, placement, open);

  useClickOutside(triggerRef, () => closeOnOutside && onOpenChange(false), open);
  useEscapeKey(() => onOpenChange(false), open);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <>
      <span ref={triggerRef} className="inline-flex">
        {trigger}
      </span>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              role={role}
              aria-labelledby={labelledBy}
              tabIndex={-1}
              style={style}
              className={`rounded-lg border border-surface-200 bg-surface-0 p-1 shadow-pop outline-none dark:border-surface-600 ${className}`}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
