import type { Branch } from "./branch";

/** Repository owner as seen by a provider (user or organization). */
export interface RepositoryOwner {
  readonly login: string;
  readonly avatarUrl: string | null;
}

/** The primary software repository concept, provider-neutral. */
export interface Repository {
  readonly id: string;
  readonly providerId: string;
  readonly fullName: string;
  readonly owner: RepositoryOwner;
  readonly name: string;
  readonly description: string | null;
  readonly url: string;
  readonly isPrivate: boolean;
  readonly isPinned: boolean;
  readonly defaultBranch: string | null;
  readonly language: string | null;
  /** ISO-8601 timestamps. */
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly pushedAt: string | null;
  readonly stars: number;
  readonly forks: number;
  readonly watchers: number;
  readonly openIssues: number;
  readonly openPullRequests: number | null;
  readonly ownerType: "user" | "organization" | "unknown";
  readonly branches: readonly Branch[] | null;
}

/** Repository detail payload assembled by a repository service. */
export interface RepositoryOverview {
  readonly repository: Repository;
  readonly languages: ReadonlyMap<string, number> | null;
  readonly readme: string | null;
  readonly latestRelease: string | null;
  readonly contributors: readonly Contributor[];
  /** Flag used by the browser/preview runtime to explain when data is mocked. */
  readonly isMock: boolean;
}

export interface Contributor {
  readonly login: string;
  readonly avatarUrl: string | null;
  readonly contributions: number;
}
