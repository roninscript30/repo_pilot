/** GitHub REST error raised to the app layer with a stable reason. */
export type GitHubApiErrorReason =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "network"
  | "unexpected";

export class GitHubApiError extends Error {
  readonly reason: GitHubApiErrorReason;
  readonly status: number | null;

  constructor(reason: GitHubApiErrorReason, message: string, status: number | null = null) {
    super(message);
    this.name = "GitHubApiError";
    this.reason = reason;
    this.status = status;
  }
}

const GITHUB_API_BASE = "https://api.github.com";
const DEFAULT_PER_PAGE = 30;

interface RequestOptions {
  readonly method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  readonly query?: readonly [string, string][];
  readonly body?: unknown;
}

/**
 * Thin typed fetch client for the GitHub REST API.
 * Kept dependency-free per ADR-0004 so HTTP details stay inspectable.
 */
export class GitHubApiClient {
  private readonly baseUrl: string;

  constructor(
    private readonly getToken: () => Promise<string | null>,
    baseUrl: string = GITHUB_API_BASE,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async get<T>(path: string, query?: readonly [string, string][]): Promise<T> {
    return this.request<T>(
      {
        method: "GET",
        ...(query !== undefined ? { query } : {}),
      },
      path,
    );
  }

  async request<T>(options: RequestOptions, path: string): Promise<T> {
    const token = await this.getToken();
    if (!token) {
      throw new GitHubApiError("unauthorized", "GitHub API token is not set", 401);
    }

    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of options.query ?? []) {
      url.searchParams.append(key, value);
    }

    let response: Response;
    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      };
      if (options.body !== undefined) {
        headers["Content-Type"] = "application/json";
      }
      response = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      });
    } catch {
      throw new GitHubApiError("network", "Failed to reach the GitHub API");
    }

    if (response.status === 401) {
      throw new GitHubApiError("unauthorized", "Token is invalid or expired", 401);
    }
    if (response.status === 403) {
      throw new GitHubApiError("forbidden", "Token lacks permission for this resource", 403);
    }
    if (response.status === 404) {
      throw new GitHubApiError("not_found", "Resource not found (or not visible with this token)", 404);
    }
    if (response.status === 429) {
      throw new GitHubApiError("rate_limited", "GitHub API rate limit reached", 429);
    }
    if (!response.ok) {
      throw new GitHubApiError("unexpected", `GitHub API error ${response.status}`, response.status);
    }

    return (await response.json()) as T;
  }
}

export function perPage(limit: number): [string, string] {
  const n = Math.min(Math.max(limit, 1), 100);
  return ["per_page", String(n)];
}

export const GITHUB_DEFAULT_PER_PAGE: number = DEFAULT_PER_PAGE;
