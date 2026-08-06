import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CredentialStore } from "@/domain/ports/credential-store";
import type { Account } from "@/domain/models/account";

const account: Account = {
  providerId: "github",
  login: "octocat",
  displayName: "Mona Octocat",
  avatarUrl: null,
  scopes: ["repo"],
  createdAt: "2026-08-01T00:00:00Z",
};

const { memoryStore, mockValidateToken } = vi.hoisted(() => {
  const tokens = new Map<string, string>();
  const validate = vi.fn();
  return {
    memoryStore: {
      kind: "memory",
      isPersistent: false,
      setToken: vi.fn(async (providerId: string, login: string, token: string) => {
        tokens.set(`${providerId}:${login}`, token);
        return true;
      }),
      getToken: vi.fn(async (providerId: string, login: string) => tokens.get(`${providerId}:${login}`) ?? null),
      deleteToken: vi.fn(async (providerId: string, login: string) => {
        tokens.delete(`${providerId}:${login}`);
      }),
      listAccounts: vi.fn(async (providerId: string) =>
        [...tokens.keys()]
          .filter((key) => key.startsWith(`${providerId}:`))
          .map((key) => key.slice(providerId.length + 1)),
      ),
    } as CredentialStore,
    mockValidateToken: validate,
  };
});

vi.mock("@/services/runtime", () => ({
  isTauriRuntime: () => false,
  resolveCredentialStore: () => memoryStore,
  resolveProvider: () => ({
    id: "github",
    displayName: "GitHub",
    validateToken: mockValidateToken,
  }),
}));

import { useAuthStore } from "./auth-store";

describe("auth store", () => {
  beforeEach(() => {
    useAuthStore.setState({ status: "unauthenticated", account: null, error: null });
    mockValidateToken.mockReset();
    mockValidateToken.mockImplementation(async () => ({ account, scopes: ["repo"] }));
  });

  it("starts unauthenticated with the memory credential store in browser preview", () => {
    const state = useAuthStore.getState();
    expect(state.status).toBe("unauthenticated");
    expect(state.credentialKind).toBe("memory");
    expect(state.isPersistent).toBe(false);
  });

  it("signs in with a valid token and persists the account", async () => {
    const result = await useAuthStore.getState().signInWithToken(useAuthStore.getState().githubProvider(), "ghp_valid");

    expect(result).toEqual(account);
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().account).toEqual(account);
    expect(mockValidateToken).toHaveBeenCalledWith("ghp_valid");
    await expect(memoryStore.getToken("github", "octocat")).resolves.toBe("ghp_valid");
  });

  it("transitions to signing-in while validation is in flight", async () => {
    let release: (() => void) | undefined;
    mockValidateToken.mockImplementation(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return { account, scopes: [] };
    });

    const pending = useAuthStore.getState().signInWithToken(useAuthStore.getState().githubProvider(), "slow");
    expect(useAuthStore.getState().status).toBe("signing-in");
    release?.();
    await pending;
  });

  it("records the error and rethrows when validation fails", async () => {
    mockValidateToken.mockRejectedValue(new Error("GitHub rejected this token."));

    await expect(
      useAuthStore.getState().signInWithToken(useAuthStore.getState().githubProvider(), "bad"),
    ).rejects.toThrow("GitHub rejected this token.");
    expect(useAuthStore.getState().status).toBe("error");
    expect(useAuthStore.getState().error).toBe("GitHub rejected this token.");
    expect(useAuthStore.getState().account).toBeNull();
  });

  it("loads a stored session on startup", async () => {
    await useAuthStore.getState().signInWithToken(useAuthStore.getState().githubProvider(), "ghp_valid");
    useAuthStore.setState({ status: "unauthenticated", account: null });

    await useAuthStore.getState().loadStoredSessions();
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().account?.login).toBe("octocat");
  });

  it("stays signed out when the stored token was revoked", async () => {
    await useAuthStore.getState().signInWithToken(useAuthStore.getState().githubProvider(), "ghp_valid");
    useAuthStore.setState({ status: "unauthenticated", account: null });
    mockValidateToken.mockRejectedValue(new Error("GitHub rejected this token."));

    await useAuthStore.getState().loadStoredSessions();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().account).toBeNull();
  });

  it("signs out and clears the stored token", async () => {
    await useAuthStore.getState().signInWithToken(useAuthStore.getState().githubProvider(), "ghp_valid");
    await useAuthStore.getState().signOut("octocat");

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().account).toBeNull();
    await expect(memoryStore.getToken("github", "octocat")).resolves.toBeNull();
  });

  it("clearError clears only the error", async () => {
    mockValidateToken.mockRejectedValue(new Error("boom"));
    await useAuthStore.getState().signInWithToken(useAuthStore.getState().githubProvider(), "x").catch(() => undefined);

    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
    expect(useAuthStore.getState().status).toBe("error");
  });
});
