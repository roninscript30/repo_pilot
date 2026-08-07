import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubApiClient, GitHubApiError, perPage } from "./api";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("GitHubApiClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const token = async () => "ghp_test_token";

  it("throws an unauthorized error when no token is set", async () => {
    const client = new GitHubApiClient(async () => null);
    await expect(client.get("/user")).rejects.toMatchObject({
      name: "GitHubApiError",
      reason: "unauthorized",
      status: 401,
    });
  });

  it("sends the bearer token and API version headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ login: "octocat" }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new GitHubApiClient(token);
    await client.get<{ login: string }>("/user");

    const [url, options] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(String(url)).toBe("https://api.github.com/user");
    expect(options.headers).toMatchObject({
      Accept: "application/vnd.github+json",
      Authorization: "Bearer ghp_test_token",
      "X-GitHub-Api-Version": "2022-11-28",
    });
  });

  it("appends query parameters to the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const client = new GitHubApiClient(token);
    await client.get("/repos/octocat/hello/issues", [["state", "open"], ["per_page", "30"]]);

    const [url] = fetchMock.mock.calls[0] as [RequestInfo | URL];
    expect(String(url)).toContain("state=open");
    expect(String(url)).toContain("per_page=30");
  });

  it("serializes the body as JSON for POST requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new GitHubApiClient(token);
    await client.request({ method: "POST", body: { title: "New issue" } }, "/repos/octocat/hello/issues");

    const [, options] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ title: "New issue" }));
    expect(options.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [429, "rate_limited"],
  ])("maps HTTP %i to reason %s", async (status, reason) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "nope" }, status)));
    const client = new GitHubApiClient(token);
    await expect(client.get("/user")).rejects.toMatchObject({ reason });
  });

  it("maps unexpected statuses to 'unexpected' with the status attached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 503)));
    const client = new GitHubApiClient(token);
    await expect(client.get("/user")).rejects.toMatchObject({ reason: "unexpected", status: 503 });
  });

  it("maps network failures to a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const client = new GitHubApiClient(token);
    await expect(client.get("/user")).rejects.toMatchObject({ reason: "network" });
  });

  it("returns parsed JSON for successful responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ login: "octocat" })));
    const client = new GitHubApiClient(token);
    await expect(client.get<{ login: string }>("/user")).resolves.toEqual({ login: "octocat" });
  });

  it("normalizes a trailing slash on the base URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    const client = new GitHubApiClient(token, "https://api.github.com/");
    await client.get("/user");
    const [url] = fetchMock.mock.calls[0] as [RequestInfo | URL];
    expect(String(url)).toBe("https://api.github.com/user");
  });
});

describe("perPage", () => {
  it("clamps the limit between 1 and 100", () => {
    expect(perPage(0)).toEqual(["per_page", "1"]);
    expect(perPage(30)).toEqual(["per_page", "30"]);
    expect(perPage(500)).toEqual(["per_page", "100"]);
  });
});

describe("GitHubApiError", () => {
  it("carries a stable reason and status", () => {
    const error = new GitHubApiError("rate_limited", "slow down", 429);
    expect(error).toBeInstanceOf(Error);
    expect(error.reason).toBe("rate_limited");
    expect(error.status).toBe(429);
    expect(error.message).toBe("slow down");
  });
});
