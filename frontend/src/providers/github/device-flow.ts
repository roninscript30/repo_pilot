/**
 * GitHub OAuth Device Flow client.
 *
 * The device flow lets a desktop app obtain an access token without a
 * browser redirect: GitHub returns a short user code, the user enters it
 * at the verification URI (ideally auto-opened), and the app polls until
 * authorization completes.
 *
 * The flow needs a registered GitHub OAuth App `client_id`. Repo Pilot
 * reads it from `VITE_GITHUB_CLIENT_ID` and falls back to a documented
 * placeholder so the flow is demoable before a real app is registered.
 */

export const DEFAULT_GITHUB_CLIENT_ID = "Iv1.repo-pilot-placeholder";

/** Response from POST /login/device/code. */
export interface DeviceFlowStart {
  readonly deviceCode: string;
  readonly userCode: string;
  readonly verificationUri: string;
  readonly expiresIn: number;
  /** Minimum seconds between polls. */
  readonly interval: number;
}

/** Result of a single access-token poll. */
export type DeviceFlowPollStatus =
  | { readonly state: "success"; readonly accessToken: string }
  | { readonly state: "authorization_pending" }
  | { readonly state: "slow_down"; readonly retryInMs: number }
  | { readonly state: "expired" }
  | { readonly state: "access_denied" };

export class DeviceFlowError extends Error {}

const DEVICE_CODE_URL = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";

/** Resolve the configured GitHub OAuth App client id. */
export function githubClientId(): string {
  const fromEnv = import.meta.env.VITE_GITHUB_CLIENT_ID;
  return typeof fromEnv === "string" && fromEnv.length > 0
    ? fromEnv
    : DEFAULT_GITHUB_CLIENT_ID;
}

interface JsonRecord {
  readonly [key: string]: unknown;
}

export class GitHubDeviceFlowClient {
  private readonly clientId: string;

  constructor(clientId: string = githubClientId()) {
    this.clientId = clientId;
  }

  /** Begin the flow: ask GitHub for a device + user code. */
  async start(): Promise<DeviceFlowStart> {
    const response = await fetch(DEVICE_CODE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        scope: "repo read:org user",
      }),
    });
    if (!response.ok) {
      throw new DeviceFlowError(`GitHub could not start sign-in (HTTP ${response.status}).`);
    }
    const data = (await response.json()) as JsonRecord;
    const deviceCode = data["device_code"];
    const userCode = data["user_code"];
    const verificationUri = data["verification_uri"];
    const expiresIn = data["expires_in"];
    if (
      typeof deviceCode !== "string" ||
      typeof userCode !== "string" ||
      typeof verificationUri !== "string" ||
      typeof expiresIn !== "number"
    ) {
      throw new DeviceFlowError("GitHub did not return a device code.");
    }
    return {
      deviceCode,
      userCode,
      verificationUri,
      expiresIn,
      interval: typeof data["interval"] === "number" ? data["interval"] : 5,
    };
  }

  /** Poll once for the access token. Throws only on network/HTTP errors. */
  async pollOnce(deviceCode: string): Promise<DeviceFlowPollStatus> {
    const response = await fetch(ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });
    if (!response.ok) {
      throw new DeviceFlowError(`GitHub could not exchange the code (HTTP ${response.status}).`);
    }
    const data = (await response.json()) as JsonRecord;
    const accessToken = data["access_token"];
    if (typeof accessToken === "string" && accessToken.length > 0) {
      return { state: "success", accessToken };
    }
    switch (data["error"]) {
      case "authorization_pending":
        return { state: "authorization_pending" };
      case "slow_down": {
        const interval = typeof data["interval"] === "number" ? data["interval"] : 5;
        return { state: "slow_down", retryInMs: interval * 1000 };
      }
      case "expired_token":
        return { state: "expired" };
      case "access_denied":
        return { state: "access_denied" };
      default:
        throw new DeviceFlowError("GitHub returned an unexpected device flow response.");
    }
  }
}
