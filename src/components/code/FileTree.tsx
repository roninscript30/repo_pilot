import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import type { TreeEntry } from "@/domain/models/code";

interface TreeNode {
  readonly name: string;
  readonly path: string;
  readonly type: "blob" | "tree";
  readonly size: number | null;
  readonly children: Map<string, TreeNode>;
}

function buildTree(entries: readonly TreeEntry[]): Map<string, TreeNode> {
  const root = new Map<string, TreeNode>();

  const ensure = (segments: readonly string[], leaf: TreeNode): TreeNode => {
    let map = root;
    let current: TreeNode | null = null;
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index] ?? "";
      const isLeaf = index === segments.length - 1;
      let child = map.get(segment);
      if (!child) {
        child = {
          name: segment,
          path: segments.slice(0, index + 1).join("/"),
          type: isLeaf ? leaf.type : "tree",
          size: isLeaf ? leaf.size : null,
          children: new Map(),
        };
        map.set(segment, child);
      }
      map = child.children;
      current = child;
    }
    return current ?? leaf;
  };

  for (const entry of entries) {
    if (entry.type === "commit") continue;
    const segments = entry.path.split("/");
    ensure(segments, {
      name: segments[segments.length - 1] ?? entry.path,
      path: entry.path,
      type: entry.type === "tree" ? "tree" : "blob",
      size: entry.size,
      children: new Map(),
    });
  }
  return root;
}

function sortedChildren(children: Map<string, TreeNode>): TreeNode[] {
  return [...children.values()].sort((a, b) => {
    if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

interface FileTreeProps {
  readonly entries: readonly TreeEntry[] | undefined;
  readonly isLoading: boolean;
  readonly currentPath: string | null;
  readonly onSelect: (path: string) => void;
  readonly defaultExpandDepth?: number;
}

/** Indented file tree with expandable directories (GitHub-style). */
export function FileTree({ entries, isLoading, currentPath, onSelect, defaultExpandDepth = 1 }: FileTreeProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const root = useMemo(() => (entries ? buildTree(entries) : new Map<string, TreeNode>()), [entries]);

  const initialExpanded = useMemo(() => {
    if (expanded.size > 0 || root.size === 0) return null;
    const set = new Set<string>();
    const walk = (nodes: readonly TreeNode[], depth: number) => {
      for (const node of nodes) {
        if (node.type === "tree" && depth < defaultExpandDepth) {
          set.add(node.path);
          walk(sortedChildren(node.children), depth + 1);
        }
      }
    };
    walk(sortedChildren(root), 0);
    return set;
  }, [root, expanded, defaultExpandDepth]);

  const effectiveExpanded = initialExpanded ?? expanded;

  function toggle(path: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner label="Loading file tree…" size="sm" />
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return <p className="px-3 py-4 text-xs text-surface-500">This repository has no files.</p>;
  }

  function renderNode(node: TreeNode, depth: number): ReactNode {
    const isDir = node.type === "tree";
    const isOpen = effectiveExpanded.has(node.path);
    const isActive = node.path === currentPath;
    const children = sortedChildren(node.children);

    return (
      <div key={node.path}>
        <button
          type="button"
          onClick={() => (isDir ? toggle(node.path) : onSelect(node.path))}
          className={`flex w-full items-center gap-1.5 px-2 py-[3px] text-left text-[13px] transition-colors ${
            isActive
              ? "bg-accent-100 text-accent-800 dark:bg-accent-100/20 dark:text-accent-400"
              : "text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700/50"
          }`}
          style={{ paddingLeft: `${6 + depth * 14}px` }}
          aria-expanded={isDir ? isOpen : undefined}
        >
          {isDir ? (
            <Icon name="chevronRight" size={11} className={`shrink-0 text-surface-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
          ) : (
            <span className="w-[11px]" />
          )}
          <Icon
            name={isDir ? "folder" : "file"}
            size={13}
            className={`shrink-0 ${isDir ? "text-accent-500" : "text-surface-400"}`}
          />
          <span className="truncate">{node.name}</span>
        </button>
        {isDir && isOpen ? (
          <div>{children.map((child) => renderNode(child, depth + 1))}</div>
        ) : null}
      </div>
    );
  }

  return <div className="pb-3">{sortedChildren(root).map((node) => renderNode(node, 0))}</div>;
}
