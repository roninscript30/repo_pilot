import type { Repository } from "@/domain/models/repository";

export type HealthLevel = "healthy" | "attention" | "stale";

export interface RepositoryHealth {
  readonly level: HealthLevel;
  readonly label: string;
  readonly detail: string;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Lightweight repository health heuristics. Phase 1 keeps these
 * transparent and simple; deeper diagnostics arrive later.
 */
export function repositoryHealth(repository: Repository): RepositoryHealth {
  if (!repository.pushedAt) {
    return { level: "stale", label: "Inactive", detail: "No recent push activity recorded." };
  }

  const pushed = new Date(repository.pushedAt).getTime();
  const ageMs = Date.now() - pushed;

  if (ageMs > THIRTY_DAYS_MS) {
    const days = Math.round(ageMs / (24 * 60 * 60 * 1000));
    return {
      level: "stale",
      label: "Inactive",
      detail: `No push in ${days} days.`,
    };
  }

  if (repository.stars > 0 && repository.openIssues / repository.stars > 0.25) {
    return {
      level: "attention",
      label: "Issue load",
      detail: `${repository.openIssues} open issues against ${repository.stars} stars.`,
    };
  }

  if (repository.openIssues > 50) {
    return {
      level: "attention",
      label: "Issue backlog",
      detail: `${repository.openIssues} open issues.`,
    };
  }

  return {
    level: "healthy",
    label: "Healthy",
    detail: "Active and stable.",
  };
}
