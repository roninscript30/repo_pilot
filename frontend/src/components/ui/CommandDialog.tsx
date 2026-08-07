import { useEffect, useMemo, useState } from "react";
import { Dialog } from "./Dialog";
import { Icon, type IconName } from "./Icon";
import { Kbd } from "./Kbd";
import { fuzzySort } from "@/lib/fuzzy";

export interface CommandItem {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: IconName;
  readonly group?: string;
  readonly keywords?: readonly string[];
  readonly disabled?: boolean;
  readonly onSelect?: () => void;
  /** Renders a trailing hint chip (e.g. result type). */
  readonly hint?: string;
}

interface CommandDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly placeholder?: string;
  readonly items: readonly CommandItem[];
  /** Skip the built-in fuzzy pass (used when items are network results). */
  readonly filterDisabled?: boolean;
  readonly loading?: boolean;
  readonly searchLabel?: string;
  /** Called with the active query when an item is selected. */
  readonly onSelect?: (query: string) => void;
}

/** Keyboard-first command surface shared by the palette and global search. */
export function CommandDialog({
  open,
  onClose,
  title,
  placeholder = "Type a command…",
  items,
  filterDisabled = false,
  loading = false,
  searchLabel = "Search",
  onSelect,
}: CommandDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (filterDisabled) return items;
    return fuzzySort(query, items, (item) => `${item.label} ${item.keywords?.join(" ") ?? ""}`);
  }, [query, items, filterDisabled]);

  const groups = useMemo(() => {
    const ordered: string[] = [];
    const byGroup = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const group = item.group ?? "Actions";
      if (!byGroup.has(group)) {
        byGroup.set(group, []);
        ordered.push(group);
      }
      byGroup.get(group)?.push(item);
    }
    return ordered.map((group) => ({ group, items: byGroup.get(group) ?? [] }));
  }, [filtered]);

  const flatIndex = useMemo(() => {
    const lookup = new Map<number, { groupIndex: number; itemIndex: number }>();
    let index = 0;
    groups.forEach((group, groupIndex) => {
      group.items.forEach((_, itemIndex) => {
        lookup.set(index, { groupIndex, itemIndex });
        index += 1;
      });
    });
    return lookup;
  }, [groups]);

  function selectAt(index: number) {
    const position = flatIndex.get(index);
    if (!position) return;
    const item = groups[position.groupIndex]?.items[position.itemIndex];
    if (!item || item.disabled) return;
    item.onSelect?.();
    onSelect?.(query);
    onClose();
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, flatIndex.size - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectAt(selectedIndex);
    } else if (event.key === "Home") {
      event.preventDefault();
      setSelectedIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setSelectedIndex(flatIndex.size - 1);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} showCloseButton={false} size="md">
      <div className="-mx-5 -mt-4 mb-2 border-b border-surface-100 px-5 pb-3 dark:border-surface-700">
        <div className="relative">
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-surface-400"
          />
          <input
            type="text"
            role="combobox"
            aria-label={searchLabel}
            aria-expanded="true"
            placeholder={placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent pr-16 pl-6 text-base text-surface-900 placeholder:text-surface-400 focus:outline-none dark:text-surface-100"
          />
          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {query ? (
              <button
                type="button"
                aria-label="Clear"
                onClick={() => setQuery("")}
                className="rounded p-0.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700"
              >
                <Icon name="x" size={13} />
              </button>
            ) : (
              <Kbd>esc</Kbd>
            )}
          </div>
        </div>
      </div>

      <div role="listbox" aria-label={searchLabel} className="-mx-5 -mb-4 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 px-5 py-6 text-sm text-surface-500">
            <Icon name="refresh" size={14} className="animate-spin" />
            Searching…
          </div>
        ) : groups.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
              No results
            </p>
            <p className="mt-1 text-xs text-surface-500">
              Nothing matches “{query}”. Try a different search.
            </p>
          </div>
        ) : (
          groups.map(({ group, items: groupItems }) => (
            <div key={group}>
              <p className="px-5 pt-3 pb-1.5 text-2xs font-semibold tracking-wide text-surface-400 uppercase">
                {group}
              </p>
              {groupItems.map((item) => {
                const index = flatIndexOf(group, item);
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={item.disabled}
                    onClick={() => selectAt(index)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex w-full items-center gap-3 px-5 py-2 text-left transition-colors ${
                      isSelected ? "bg-surface-100 dark:bg-surface-700" : ""
                    } ${item.disabled ? "opacity-50" : ""}`}
                  >
                    {item.icon ? (
                      <Icon
                        name={item.icon}
                        size={16}
                        className={isSelected ? "text-accent-600 dark:text-accent-500" : "text-surface-400"}
                      />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-surface-900 dark:text-surface-100">
                        {item.label}
                      </span>
                      {item.description ? (
                        <span className="block truncate text-xs text-surface-500">{item.description}</span>
                      ) : null}
                    </span>
                    {item.hint ? (
                      <span className="shrink-0 text-2xs text-surface-400">{item.hint}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="-mx-5 -mb-4 mt-2 flex items-center gap-4 border-t border-surface-100 px-5 py-2.5 text-2xs text-surface-400 dark:border-surface-700">
        <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
        <span className="flex items-center gap-1"><Kbd>enter</Kbd> select</span>
        <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
      </div>
    </Dialog>
  );

  function flatIndexOf(group: string, item: CommandItem): number {
    let index = 0;
    for (const { group: g, items: gi } of groups) {
      for (const it of gi) {
        if (g === group && it.id === item.id) return index;
        index += 1;
      }
    }
    return 0;
  }
}
