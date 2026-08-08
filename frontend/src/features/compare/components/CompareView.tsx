import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { SearchInput } from "@/components/ui/SearchInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SelectField } from "@/components/ui/SelectField";
import { Spinner } from "@/components/ui/Spinner";
import { TextField } from "@/components/ui/TextField";
import { DiffViewer } from "@/features/git/components/DiffViewer";
import {
  useDiffFiles,
  useLocalBranches,
  useLocalTags,
  useLocalWorktree,
  useMergePreview,
  useRefComparison,
} from "@/features/git/hooks";
import { summarizeFiles } from "@/features/git/lib/compare";
import type { FileDiff, MergePreview, RefComparison } from "@/domain/models/git";
import type { CommitSummary } from "@/domain/models/commit";
import type { IconName } from "@/components/ui/Icon";

interface CompareViewProps {
  readonly path: string;
}

/** What the user can point a compare side at. */
export type RefKind = "branch" | "tag" | "commit" | "worktree";

interface CompareRef {
  readonly kind: RefKind;
  /** Branch/tag name, free-form rev string, or "worktree". */
  readonly name: string;
}

/** Backend ref string for a picker selection; null when incomplete. */
function refValue(ref: CompareRef | null): string | null {
  if (!ref) return null;
  if (ref.kind === "worktree") return "worktree";
  const name = ref.name.trim();
  return name.length === 0 ? null : name;
}

function refLabel(ref: CompareRef | null): string {
  if (!ref) return "—";
  if (ref.kind === "worktree") return "Working tree";
  const name = ref.name.trim();
  if (name.length === 0) return "…";
  return ref.kind === "commit" ? name.slice(0, 12) : name;
}

const KIND_OPTIONS: readonly { value: RefKind; label: string }[] = [
  { value: "branch", label: "Branch" },
  { value: "tag", label: "Tag" },
  { value: "commit", label: "Commit / rev" },
  { value: "worktree", label: "Working tree" },
];

const FILE_STATUS_ICON: Record<FileDiff["status"], IconName> = {
  added: "plus",
  removed: "trash",
  modified: "pencil",
  renamed: "gitCompare",
};

const FILE_STATUS_TONE: Record<FileDiff["status"], "neutral" | "success" | "warning" | "danger" | "accent"> = {
  added: "success",
  removed: "danger",
  modified: "warning",
  renamed: "accent",
};

const STATUS_LABEL: Record<FileDiff["status"], string> = {
  added: "added",
  removed: "removed",
  modified: "modified",
  renamed: "renamed",
};

/**
 * The Compare activity: pick two refs (branch, tag, commit or the working
 * tree), see their divergence, browse the changed files as a tree with a
 * full structured diff, and preview a merge or rebase before running it.
 */
export function CompareView({ path }: CompareViewProps) {
  const worktree = useLocalWorktree(path);
  const branchesQuery = useLocalBranches(path);
  const tagsQuery = useLocalTags(path);

  const currentBranch = worktree.data?.currentBranch ?? null;
  const trackingBranch = worktree.data?.trackingBranch ?? null;
  const headSha = worktree.data?.headSha ?? null;
  const branches = useMemo(() => branchesQuery.data ?? [], [branchesQuery.data]);
  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);

  const [base, setBase] = useState<CompareRef | null>(null);
  const [target, setTarget] = useState<CompareRef | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || !currentBranch) return;
    seeded.current = true;
    const other = branches.find((branch) => branch.name !== currentBranch);
    setBase({ kind: "branch", name: currentBranch });
    setTarget({ kind: "branch", name: other?.name ?? "HEAD~1" });
  }, [branches, currentBranch]);

  const baseRef = refValue(base);
  const targetRef = refValue(target);
  const enabled = baseRef !== null && targetRef !== null && baseRef !== targetRef;

  const filesQuery = useDiffFiles(path, baseRef, targetRef, enabled);
  const comparison = useRefComparison(path, baseRef, targetRef, enabled);
  const mergePreview = useMergePreview(path, targetRef, baseRef, enabled);

  const files = useMemo(() => filesQuery.data ?? [], [filesQuery.data]);
  const fileTree = useMemo(() => buildFileTree(files), [files]);

  const [filter, setFilter] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!fileTree.children || fileTree.children.length === 0) {
      setSelectedPath(null);
      return;
    }
    const known = new Set(files.map((file) => file.path));
    setSelectedPath((current) => (current !== null && known.has(current) ? current : firstFilePath(fileTree)));
    setExpanded((current) => {
      if (current.size > 0) return current;
      const topDirs = fileTree.children.filter((node) => node.kind === "dir").map((node) => node.path);
      return new Set(topDirs);
    });
  }, [files, fileTree]);

  const visibleFiles = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return files;
    return files.filter((file) => file.path.toLowerCase().includes(needle));
  }, [files, filter]);

  const visibleTree = useMemo(
    () => (filter.trim() ? buildFileTree(visibleFiles) : fileTree),
    [visibleFiles, fileTree, filter],
  );

  const selectedFile = useMemo(
    () => files.find((file) => file.path === selectedPath) ?? null,
    [files, selectedPath],
  );

  if (worktree.isLoading || branchesQuery.isLoading || tagsQuery.isLoading) {
    return (
      <div className="flex justify-center py-14">
        <Spinner label="Reading refs…" size="sm" />
      </div>
    );
  }

  if (worktree.isError || branchesQuery.isError) {
    return (
      <div className="px-6 py-12">
        <EmptyState
          title="Compare unavailable"
          description={
            branchesQuery.error instanceof Error
              ? branchesQuery.error.message
              : "The linked path does not look like a Git repository."
          }
        />
      </div>
    );
  }

  const summary = filesQuery.data ? summarizeFiles(filesQuery.data) : null;

  return (
    <div className="flex min-h-[480px] flex-col gap-4 px-6 py-5">
      <Card>
        <CardHeader
          title="Compare refs"
          subtitle="Base is the reference point; target is measured against it. Either side can be a branch, tag, commit, or the working tree."
        />
        <div className="flex flex-wrap items-end gap-3 p-4">
          <RefPicker
            label="Base"
            id="compare-base"
            value={base}
            branches={branches}
            tags={tags}
            onChange={setBase}
          />
          <Button
            size="sm"
            variant="ghost"
            className="mb-2.5"
            disabled={!base || !target}
            onClick={() => {
              setBase(target);
              setTarget(base);
            }}
          >
            <Icon name="gitCompare" size={14} />
            Swap
          </Button>
          <RefPicker
            label="Target"
            id="compare-target"
            value={target}
            branches={branches}
            tags={tags}
            onChange={setTarget}
          />
        </div>
        <QuickCompareRow
          currentBranch={currentBranch}
          trackingBranch={trackingBranch}
          headSha={headSha}
          onSelect={(nextBase, nextTarget) => {
            setBase(nextBase);
            setTarget(nextTarget);
          }}
        />
      </Card>

      {!enabled ? (
        <EmptyState title="Pick two refs to compare" description="Choose a base and a target, or use a quick compare below." />
      ) : (
        <>
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            <CompareStatsCard comparison={comparison.data} baseRef={baseRef} targetRef={targetRef} />

            <Card>
              <CardHeader
                title="Divergence"
                subtitle={`${refLabel(target)} vs ${refLabel(base)}`}
              />
              <div className="space-y-4 p-4">
                {comparison.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner label="Reading commits…" size="sm" />
                  </div>
                ) : comparison.isError || !comparison.data ? (
                  <p className="text-xs text-surface-500">Divergence unavailable.</p>
                ) : (
                  <>
                    <CommitLane
                      title={`Commits only on ${refLabel(target)}`}
                      empty="No commits that are not already in the base."
                      commits={comparison.data.commits}
                      count={comparison.data.aheadBy}
                    />
                    <div className="flex items-center gap-2 rounded-lg border border-surface-200 p-3 text-xs text-surface-600 dark:border-surface-600 dark:text-surface-300">
                      <Icon name="gitAhead" size={14} className="shrink-0 text-surface-400" />
                      <span>
                        Base has{" "}
                        <strong>{comparison.data.behindBy}</strong> commit
                        {comparison.data.behindBy === 1 ? "" : "s"} the target does not reach.
                      </span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Changed files"
              subtitle={summary ? `${summary.files} file${summary.files === 1 ? "" : "s"} · +${summary.additions} −${summary.deletions}` : ""}
            />
            <div className="grid min-h-[340px] grid-cols-1 items-stretch lg:grid-cols-[minmax(260px,340px)_1fr]">
              <div className="border-b border-surface-100 lg:border-r lg:border-b-0 dark:border-surface-700/60">
                <div className="border-b border-surface-100 px-3 py-2 dark:border-surface-700/60">
                  <SearchInput value={filter} onChange={setFilter} placeholder="Filter files…" />
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  {filesQuery.isLoading ? (
                    <div className="flex justify-center py-10">
                      <Spinner label="Diffing refs…" size="sm" />
                    </div>
                  ) : filesQuery.isError ? (
                    <p className="px-4 py-8 text-xs text-danger-600 dark:text-danger-400">
                      {filesQuery.error instanceof Error
                        ? filesQuery.error.message
                        : "The file diff could not be computed."}
                    </p>
                  ) : visibleTree.children && visibleTree.children.length > 0 ? (
                    <ul className="py-1">
                      <FileTreeNode
                        node={visibleTree}
                        depth={-1}
                        selectedPath={selectedPath}
                        expanded={expanded}
                        onSelect={setSelectedPath}
                        onToggle={(dirPath) =>
                          setExpanded((current) => {
                            const next = new Set(current);
                            if (next.has(dirPath)) next.delete(dirPath);
                            else next.add(dirPath);
                            return next;
                          })
                        }
                      />
                    </ul>
                  ) : (
                    <p className="px-4 py-8 text-center text-xs text-surface-500">
                      {filter ? "No files match the filter." : "No file changes between these refs."}
                    </p>
                  )}
                </div>
              </div>

              <div className="min-w-0 p-4" aria-label="Diff of selected file">
                {selectedFile ? (
                  <DiffViewer
                    change={{
                      filename: selectedFile.path,
                      status: selectedFile.status,
                      additions: selectedFile.additions,
                      deletions: selectedFile.deletions,
                    }}
                    patch={selectedFile.patch}
                    {...(selectedFile.hunks ? { hunks: selectedFile.hunks } : {})}
                    binary={selectedFile.binary}
                  />
                ) : (
                  <p className="px-4 py-12 text-center text-xs text-surface-500">
                    Select a file to see its structured diff.
                  </p>
                )}
              </div>
            </div>
          </Card>

          <MergePreviewCard
            baseRef={baseRef}
            targetRef={targetRef}
            mergePreview={mergePreview.data}
            isLoading={mergePreview.isLoading}
            isError={mergePreview.isError}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pickers and quick compares
// ---------------------------------------------------------------------------

function RefPicker({
  label,
  id,
  value,
  branches,
  tags,
  onChange,
}: {
  readonly label: string;
  readonly id: string;
  readonly value: CompareRef | null;
  readonly branches: readonly { name: string }[];
  readonly tags: readonly { name: string }[];
  readonly onChange: (ref: CompareRef | null) => void;
}) {
  const kind = value?.kind ?? "branch";
  const branchOptions = branches.map((branch) => ({ value: branch.name, label: branch.name }));
  const tagOptions = tags.map((tag) => ({ value: tag.name, label: tag.name }));

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-2xs font-medium text-surface-500 dark:text-surface-400">{label}</span>
      <div className="flex items-center gap-2">
        <SelectField
          id={id}
          value={kind}
          options={KIND_OPTIONS}
          className="w-36"
          onChange={(event) => {
            const nextKind = event.target.value as RefKind;
            if (nextKind === "worktree") {
              onChange({ kind: nextKind, name: "worktree" });
            } else {
              const name =
                nextKind === "branch"
                  ? value?.kind === "branch"
                    ? value.name
                    : (branches[0]?.name ?? "")
                  : nextKind === "tag"
                    ? value?.kind === "tag"
                      ? value.name
                      : (tags[0]?.name ?? "")
                    : value?.kind === "commit"
                      ? value.name
                      : "";
              onChange({ kind: nextKind, name });
            }
          }}
        />
        {kind === "worktree" ? (
          <span className="flex h-8 items-center gap-1.5 text-xs text-surface-500">
            <Icon name="folder" size={13} />
            current on-disk state
          </span>
        ) : kind === "commit" ? (
          <TextField
            aria-label={`${label} revision`}
            value={value?.name ?? ""}
            placeholder="e.g. HEAD~2, origin/main, abc123"
            className="w-64"
            onChange={(event) => onChange({ kind, name: event.target.value })}
          />
        ) : (
          <SelectField
            id={`${id}-value`}
            value={value?.kind === kind ? value.name : ""}
            options={kind === "branch" ? branchOptions : tagOptions}
            className="w-64"
            onChange={(event) => onChange({ kind, name: event.target.value })}
          />
        )}
      </div>
    </div>
  );
}

function QuickCompareRow({
  currentBranch,
  trackingBranch,
  headSha,
  onSelect,
}: {
  readonly currentBranch: string | null;
  readonly trackingBranch: string | null;
  readonly headSha: string | null;
  readonly onSelect: (base: CompareRef, target: CompareRef) => void;
}) {
  const presets: readonly { id: string; label: string; enabled: boolean; base: CompareRef; target: CompareRef }[] = [
    {
      id: "worktree-head",
      label: "Working tree ↔ HEAD",
      enabled: headSha !== null,
      base: { kind: "worktree", name: "worktree" },
      target: { kind: "commit", name: "HEAD" },
    },
    {
      id: "head-prev",
      label: "HEAD ↔ previous commit",
      enabled: headSha !== null,
      base: { kind: "commit", name: "HEAD~1" },
      target: { kind: "commit", name: "HEAD" },
    },
    {
      id: "local-remote",
      label: "Local ↔ remote",
      enabled: currentBranch !== null && trackingBranch !== null,
      base: { kind: "branch", name: currentBranch ?? "" },
      target: { kind: "branch", name: trackingBranch ?? "" },
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-surface-100 px-4 py-3 dark:border-surface-700/60">
      <span className="text-2xs font-medium uppercase tracking-wide text-surface-400">Quick compare</span>
      {presets.map((preset) => (
        <Button
          key={preset.id}
          size="sm"
          variant="secondary"
          disabled={!preset.enabled}
          onClick={() => onSelect(preset.base, preset.target)}
        >
          <Icon name="zap" size={12} />
          {preset.label}
        </Button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats + divergence
// ---------------------------------------------------------------------------

function CompareStatsCard({
  comparison,
  baseRef,
  targetRef,
}: {
  readonly comparison: RefComparison | undefined;
  readonly baseRef: string;
  readonly targetRef: string;
}) {
  if (!comparison) {
    return (
      <Card>
        <CardHeader title="Comparison" subtitle="Computing…" />
      </Card>
    );
  }
  const conflicts = comparison.conflictPaths.length;
  return (
    <Card>
      <CardHeader
        title="Comparison"
        subtitle={
          comparison.mergeBase
            ? `merge base ${comparison.mergeBase.slice(0, 7)}`
            : "no common ancestor"
        }
      />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-surface-200 p-3 text-center dark:border-surface-600">
            <p className="inline-flex items-center gap-1 text-lg font-bold text-success-600 dark:text-success-400">
              <Icon name="gitAhead" size={15} />
              {comparison.aheadBy}
            </p>
            <p className="text-2xs text-surface-500">target ahead of base</p>
          </div>
          <div className="rounded-lg border border-surface-200 p-3 text-center dark:border-surface-600">
            <p className="inline-flex items-center gap-1 text-lg font-bold text-warning-600 dark:text-warning-400">
              <Icon name="gitBehind" size={15} />
              {comparison.behindBy}
            </p>
            <p className="text-2xs text-surface-500">base ahead of target</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-surface-600 dark:text-surface-300">
          <span>
            {comparison.files.length} file{comparison.files.length === 1 ? "" : "s"} changed
          </span>
          {conflicts > 0 ? (
            <Badge tone="danger">{conflicts} overlapping path{conflicts === 1 ? "" : "s"}</Badge>
          ) : (
            <Badge tone="success">no overlapping paths</Badge>
          )}
        </div>

        {comparison.files.length > 0 ? (
          <div>
            <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-surface-400">
              Files by status
            </h3>
            <div className="flex flex-wrap gap-2">
              {(["added", "removed", "modified", "renamed"] as const).map((status) => {
                const count = comparison.files.filter((file) => file.status === status).length;
                if (count === 0) return null;
                return (
                  <Badge key={status} tone={FILE_STATUS_TONE[status]}>
                    {count} {STATUS_LABEL[status]}
                  </Badge>
                );
              })}
            </div>
          </div>
        ) : null}

        <p className="text-2xs text-surface-400">
          {targetRef} vs {baseRef}; paths changed on both sides predict merge conflicts.
        </p>
      </div>
    </Card>
  );
}

function CommitLane({
  title,
  empty,
  commits,
  count,
}: {
  readonly title: string;
  readonly empty: string;
  readonly commits: readonly CommitSummary[];
  readonly count: number;
}) {
  return (
    <div>
      <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-surface-400">
        {title} {count > commits.length ? `(${count} total)` : ""}
      </h3>
      {commits.length === 0 ? (
        <p className="text-xs text-surface-500">{empty}</p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {commits.map((commit) => (
            <li key={commit.sha} className="flex items-center gap-2 text-xs">
              <Icon name="gitCommit" size={11} className="shrink-0 text-surface-400" />
              <span className="min-w-0 flex-1 truncate text-surface-700 dark:text-surface-300">
                {commit.subject}
              </span>
              <code className="shrink-0 text-2xs text-surface-400">{commit.shortSha}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// File tree
// ---------------------------------------------------------------------------

interface TreeNode {
  readonly name: string;
  readonly path: string;
  readonly kind: "dir" | "file";
  readonly children: TreeNode[];
  readonly file?: FileDiff;
}

function buildFileTree(files: readonly FileDiff[]): TreeNode {
  const root: TreeNode = { name: "", path: "", kind: "dir", children: [] };
  for (const file of files) {
    const parts = file.path.split("/");
    let node = root;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const segment = parts[index]!;
      let child = node.children.find(
        (candidate) => candidate.kind === "dir" && candidate.name === segment,
      );
      if (!child) {
        child = { name: segment, path: parts.slice(0, index + 1).join("/"), kind: "dir", children: [] };
        node.children.push(child);
      }
      node = child;
    }
    node.children.push({ name: parts[parts.length - 1]!, path: file.path, kind: "file", children: [], file });
  }
  return root;
}

function firstFilePath(node: TreeNode): string | null {
  if (node.kind === "file") return node.path;
  for (const child of node.children) {
    const found = firstFilePath(child);
    if (found) return found;
  }
  return null;
}

function FileTreeNode({
  node,
  depth,
  selectedPath,
  expanded,
  onSelect,
  onToggle,
}: {
  readonly node: TreeNode;
  readonly depth: number;
  readonly selectedPath: string | null;
  readonly expanded: ReadonlySet<string>;
  readonly onSelect: (path: string) => void;
  readonly onToggle: (path: string) => void;
}) {
  if (node.kind === "dir") {
    const open = expanded.has(node.path);
    return (
      <>
        {depth >= 0 ? (
          <li className="flex items-center gap-1 py-0.5 text-xs">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-surface-700 hover:text-surface-900 dark:text-surface-300 dark:hover:text-surface-100"
              onClick={() => onToggle(node.path)}
            >
              <Icon name={open ? "chevronDown" : "chevronRight"} size={11} className="shrink-0 text-surface-400" />
              <Icon name="folder" size={12} className="shrink-0 text-accent-600 dark:text-accent-400" />
              <span className="truncate font-medium">{node.name}</span>
              <span className="text-2xs text-surface-400">{node.children?.length ?? 0}</span>
            </button>
          </li>
        ) : null}
        {open
          ? (node.children).map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                expanded={expanded}
                onSelect={onSelect}
                onToggle={onToggle}
              />
            ))
          : null}
      </>
    );
  }

  const file = node.file;
  const selected = selectedPath === node.path;
  return (
    <li
      className={`flex items-center gap-1.5 py-0.5 pl-2 text-xs ${
        selected ? "bg-accent-50 dark:bg-accent-900/30" : "hover:bg-surface-100 dark:hover:bg-surface-700/50"
      }`}
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
    >
      <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 text-left" onClick={() => onSelect(node.path)}>
        <Icon name={file ? FILE_STATUS_ICON[file.status] : "file"} size={12} className="shrink-0 text-surface-400" />
        <span className="min-w-0 flex-1 truncate text-surface-700 dark:text-surface-300">{node.name}</span>
        {file ? (
          <>
            <span className="shrink-0 text-2xs text-success-600 dark:text-success-400">+{file.additions}</span>
            <span className="shrink-0 text-2xs text-danger-600 dark:text-danger-400">−{file.deletions}</span>
          </>
        ) : null}
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Merge / rebase preview
// ---------------------------------------------------------------------------

type PreviewMode = "merge" | "rebase";

function MergePreviewCard({
  baseRef,
  targetRef,
  mergePreview,
  isLoading,
  isError,
}: {
  readonly baseRef: string;
  readonly targetRef: string;
  readonly mergePreview: MergePreview | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
}) {
  const [mode, setMode] = useState<PreviewMode>("merge");
  const preview = mergePreview;
  const summary = preview ? summarizeFiles(preview.filesChanged) : null;

  const headline =
    mode === "merge"
      ? `Merging ${targetRef} into ${baseRef}`
      : `Replaying ${targetRef} onto ${baseRef}`;

  return (
    <Card>
      <CardHeader
        title="Operation preview"
        subtitle={headline}
        action={
          <SegmentedControl
            ariaLabel="Preview mode"
            value={mode}
            onChange={(next) => setMode(next as PreviewMode)}
            options={[
              { value: "merge", label: "Merge" },
              { value: "rebase", label: "Rebase" },
            ]}
          />
        }
      />
      <div className="space-y-4 p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Simulating operation…" size="sm" />
          </div>
        ) : isError || !preview ? (
          <p className="text-xs text-surface-500">Preview unavailable.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={preview.canMerge ? "success" : "danger"}>
                {preview.canMerge
                  ? preview.fastForward && mode === "merge"
                    ? "fast-forward merge"
                    : preview.fastForward
                      ? "already based on target"
                      : "clean operation"
                  : "conflicts expected"}
              </Badge>
              {preview.fastForward ? <Badge tone="neutral">fast-forward</Badge> : null}
            </div>
            {summary ? (
              <p className="text-xs text-surface-500">
                {summary.files} file{summary.files === 1 ? "" : "s"} would change · +{summary.additions} −
                {summary.deletions}
              </p>
            ) : null}
            {preview.conflictPaths.length > 0 ? (
              <div>
                <h3 className="mb-1.5 flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-danger-600 dark:text-danger-400">
                  <Icon name="alertCircle" size={12} />
                  Predicted conflicts
                </h3>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {preview.conflictPaths.map((path) => (
                    <li key={path} className="truncate font-mono text-xs text-surface-600 dark:text-surface-300">
                      {path}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-2xs text-surface-400">
              {mode === "merge"
                ? "Merge and rebase share the same path-level conflict prediction from the merge base; line-level conflicts only surface during the operation."
                : "Conflicts are predicted at file granularity from the merge base; the rebase may still hit line-level conflicts."}
              Preview is a simulation; no files are written.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
