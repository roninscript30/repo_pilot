import type { RefComparisonFile } from "@/domain/models/git";

/** Paths changed on both sides of a comparison (merge conflict prediction). */
export function overlappingPaths(
  baseFiles: readonly RefComparisonFile[],
  targetFiles: readonly RefComparisonFile[],
): readonly string[] {
  const base = new Set(baseFiles.map((file) => file.path));
  const target = new Set(targetFiles.map((file) => file.path));
  const overlap: string[] = [];
  for (const path of base) {
    if (target.has(path)) overlap.push(path);
  }
  return overlap.sort();
}

export interface DiffSummary {
  readonly additions: number;
  readonly deletions: number;
  readonly files: number;
}

export function summarizeFiles(files: readonly RefComparisonFile[]): DiffSummary {
  let additions = 0;
  let deletions = 0;
  for (const file of files) {
    additions += file.additions;
    deletions += file.deletions;
  }
  return { additions, deletions, files: files.length };
}
