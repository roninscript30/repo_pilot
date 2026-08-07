import { create } from "zustand";
import type { Account } from "@/domain/models/account";
import type { CredentialStore } from "@/domain/ports/credential-store";
import type { Provider } from "@/domain/ports/provider";
import { providerRegistry } from "@/providers/registry";

export type AuthStatus = "unauthenticated" | "signing-in" | "authenticated" | "error";

interface AuthState {
  readonly status: AuthStatus;
  readonly account: Account | null;
  readonly error: string | null;
  readonly credentialKind: CredentialStore["kind"];
  readonly isPersistent: boolean;

  githubProvider(): Provider;
  signInWithToken(provider: Provider, token: string): Promise<Account>;
  loadStoredSessions(): Promise<void>;
  signOut(accountLogin: string): Promise<void>;
  clearError(): void;
}

/**
 * Auth store. Uses the application-wide provider registry so the
 * credential store used at sign-in is the same store the providers
 * read tokens from later (single source of truth, ADR-0005).
 */
export const useAuthStore = create<AuthState>()((set) => {
  const credentialStore = providerRegistry.getCredentialStore();
  const githubProviderInstance = providerRegistry.githubProvider();

  return {
    status: "unauthenticated",
    account: null,
    error: null,
    credentialKind: credentialStore.kind,
    isPersistent: credentialStore.isPersistent,

    githubProvider: () => githubProviderInstance,

    signInWithToken: async (provider, token) => {
      set({ status: "signing-in", error: null });
      try {
        const validation = await provider.validateToken(token);
        await credentialStore.setToken(provider.id, validation.account.login, token);
        set({
          status: "authenticated",
          account: validation.account,
          error: null,
        });
        return validation.account;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sign-in failed.";
        set({ status: "error", error: message });
        throw error;
      }
    },

    loadStoredSessions: async () => {
      const accounts = await credentialStore.listAccounts(githubProviderInstance.id);
      if (accounts.length > 0) {
        const login = accounts[0] ?? "";
        const token = await credentialStore.getToken(githubProviderInstance.id, login);
        if (token) {
          try {
            const validation = await githubProviderInstance.validateToken(token);
            set({
              status: "authenticated",
              account: validation.account,
              credentialKind: credentialStore.kind,
              isPersistent: credentialStore.isPersistent,
            });
            return;
          } catch {
            // Expired or revoked token: fall through and stay signed out.
          }
        }
      }
      set({ status: "unauthenticated", account: null });
    },

    signOut: async (accountLogin) => {
      await credentialStore.deleteToken(githubProviderInstance.id, accountLogin);
      set({ status: "unauthenticated", account: null, error: null });
    },

    clearError: () => set({ error: null }),
  };
});
