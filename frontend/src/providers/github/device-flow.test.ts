import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubDeviceFlowClient, DeviceFlowError } from "./device-flow";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GitHubDeviceFlowClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts the flow and maps the device code response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        device_code: "dc_123",
        user_code: "ABCD-EFGH",
        verification_uri: "https://github.com/login/device",
        expires_in: 900,
        interval: 5,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new GitHubDeviceFlowClient("client-1");
    const start = await client.start();

    expect(start).toEqual({
      deviceCode: "dc_123",
      userCode: "ABCD-EFGH",
      verificationUri: "https://github.com/login/device",
      expiresIn: 900,
      interval: 5,
    });

    const [url, options] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(String(url)).toBe("https://github.com/login/device/code");
    expect((options.body as string)).toContain('"client_id":"client-1"');
    expect((options.body as string)).toContain('"scope":"repo read:org user"');
  });

  it("throws when GitHub omits the device code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "invalid_client" })));

    await expect(new GitHubDeviceFlowClient("client-1").start()).rejects.toBeInstanceOf(DeviceFlowError);
  });

  it("reports success with the access token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ access_token: "gho_device_token", token_type: "bearer" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new GitHubDeviceFlowClient("client-1").pollOnce("dc_123");
    expect(result).toEqual({ state: "success", accessToken: "gho_device_token" });

    const [, options] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect((options.body as string)).toContain('"device_code":"dc_123"');
  });

  it("reports pending while the user has not authorized", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "authorization_pending" })));

    const result = await new GitHubDeviceFlowClient("client-1").pollOnce("dc_123");
    expect(result).toEqual({ state: "authorization_pending" });
  });

  it("reports slow_down with the updated interval", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "slow_down", interval: 10 })));

    const result = await new GitHubDeviceFlowClient("client-1").pollOnce("dc_123");
    expect(result).toEqual({ state: "slow_down", retryInMs: 10_000 });
  });

  it("reports expired and denied states", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "expired_token" })));
    const expired = await new GitHubDeviceFlowClient("client-1").pollOnce("dc_123");
    expect(expired).toEqual({ state: "expired" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "access_denied" })));
    const denied = await new GitHubDeviceFlowClient("client-1").pollOnce("dc_123");
    expect(denied).toEqual({ state: "access_denied" });
  });
});
