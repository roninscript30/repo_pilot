import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Popover } from "./Popover";
import { Icon, type IconName } from "./Icon";
import type { Placement } from "@/hooks/use-anchored-position";

export interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: IconName;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly onSelect?: () => void;
}

interface DropdownMenuProps {
  readonly trigger: ReactNode;
  readonly items?: readonly MenuItem[];
  readonly placement?: Placement;
  readonly minWidth?: number;
  readonly ariaLabel: string;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /** Custom content (mutually exclusive with items). */
  readonly children?: ReactNode;
}

/** Keyboard-navigable dropdown menu anchored to a trigger button. */
export function DropdownMenu({
  trigger,
  items = [],
  placement = "bottom-end",
  minWidth = 200,
  ariaLabel,
  open: controlledOpen,
  onOpenChange,
  children,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const visibleItems = items.filter((item) => !item.disabled);

  function move(direction: 1 | -1) {
    setActiveIndex((index) => {
      const next = (index + direction + visibleItems.length) % visibleItems.length;
      return Math.max(0, next);
    });
  }

  function select(index: number) {
    const item = items[index];
    if (item && !item.disabled) {
      item.onSelect?.();
      setInternalOpen(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      select(activeIndex);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(0, visibleItems.length - 1));
    }
  }

  function handleOpenChange(next: boolean) {
    setInternalOpen(next);
    onOpenChange?.(next);
    if (next) setActiveIndex(0);
  }

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      placement={placement}
      role="menu"
      labelledBy={ariaLabel}
      trigger={
        <span
          role="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={ariaLabel}
          onClick={() => handleOpenChange(!open)}
        >
          {trigger}
        </span>
      }
    >
      <div
        ref={listRef}
        role="menu"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        style={{ minWidth }}
        className="max-h-80 overflow-y-auto py-0.5"
      >
        {children ??
          items.map((item, index) => {
          if (item.id.startsWith("--")) {
            return <div key={item.id} className="mx-2 my-1 border-t border-surface-200 dark:border-surface-600" />;
          }
          const isActive = activeIndex === index;
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => select(index)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                isActive ? "bg-surface-100 dark:bg-surface-700" : ""
              } ${item.danger ? "text-danger-600 dark:text-danger-500" : "text-surface-700 dark:text-surface-200"} ${
                item.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
            >
              {item.icon ? <Icon name={item.icon} size={15} /> : null}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.description ? (
                <span className="truncate text-2xs text-surface-400">{item.description}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Popover>
  );
}