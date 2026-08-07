import { create } from "zustand";
import type { Account } from "@/domain/models/account";
import type { CredentialStore } from "@/domain/ports/credential-store";
import type { Provider } from "@/domain/ports/provider";
import { providerRegistry } from "@/providers/registry";
import { queryClient } from "@/services/query-client";
import { loadPreference, savePreference } from "@/services/user-preferences";

export type AuthStatus = "unauthenticated" | "signing-in" | "authenticated" | "error";

const ACTIVE_ACCOUNT_KEY = "auth.activeAccount";

interface AuthState {
  readonly status: AuthStatus;
  /** Every connected account whose token is still valid. */
  readonly accounts: readonly Account[];
  /** The active account (the one provider queries resolve to), or null. */
  readonly account: Account | null;
  readonly error: string | null;
  readonly credentialKind: CredentialStore["kind"];
  readonly isPersistent: boolean;
  /** Increments whenever the active account changes; key for account-scoped UI. */
  readonly epoch: number;

  githubProvider(): Provider;
  signInWithToken(provider: Provider, token: string): Promise<Account>;
  loadStoredSessions(): Promise<void>;
  switchAccount(login: string): Promise<void>;
  removeAccount(login: string): Promise<void>;
  signOut(accountLogin: string): Promise<void>;
  clearError(): void;
}

/**
 * Auth store. Holds every connected account and the active one, backed by
 * the OS keyring on desktop (in-memory in browser preview, ADR-0005).
 *
 * The active account drives the provider registry, so provider queries
 * resolve to the active account's token. Changing the active account
 * clears the React Query cache so no stale cross-account data lingers.
 */
export const useAuthStore = create<AuthState>()((set, get) => {
  const credentialStore = providerRegistry.getCredentialStore();
  const githubProviderInstance = providerRegistry.githubProvider();

  function setActive(login: string | null) {
    providerRegistry.setActiveAccount(login);
    savePreference(ACTIVE_ACCOUNT_KEY, login);
  }

  return {
    status: "unauthenticated",
    accounts: [],
    account: null,
    error: null,
    credentialKind: credentialStore.kind,
    isPersistent: credentialStore.isPersistent,
    epoch: 0,

    githubProvider: () => providerRegistry.githubProvider(),

    signInWithToken: async (provider, token) => {
      set({ status: "signing-in", error: null });
      try {
        const validation = await provider.validateToken(token);
        await credentialStore.setToken(provider.id, validation.account.login, token);
        const nextAccount = validation.account;
        const accounts = [
          ...get().accounts.filter((account) => account.login !== nextAccount.login),
          nextAccount,
        ];
        setActive(nextAccount.login);
        set({
          status: "authenticated",
          accounts,
          account: nextAccount,
          epoch: get().epoch + 1,
          error: null,
        });
        queryClient.clear();
        return nextAccount;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sign-in failed.";
        set({ status: "error", error: message });
        throw error;
      }
    },

    loadStoredSessions: async () => {
      const logins = await credentialStore.listAccounts(githubProviderInstance.id);
      if (logins.length === 0) {
        set({ status: "unauthenticated", accounts: [], account: null });
        return;
      }

      const validated: Account[] = [];
      for (const login of logins) {
        const token = await credentialStore.getToken(githubProviderInstance.id, login);
        if (!token) {
          continue;
        }
        try {
          const validation = await githubProviderInstance.validateToken(token);
          validated.push(validation.account);
        } catch {
          // Expired or revoked token: skip the account. It can be removed
          // from Settings once the user is signed in.
        }
      }

      if (validated.length === 0) {
        set({ status: "unauthenticated", accounts: [], account: null });
        return;
      }

      const preferred = loadPreference<string | null>(ACTIVE_ACCOUNT_KEY, null);
      const active = validated.find((account) => account.login === preferred) ?? validated[0] ?? null;
      providerRegistry.setActiveAccount(active?.login ?? null);
      set({
        status: "authenticated",
        accounts: validated,
        account: active,
        error: null,
        credentialKind: credentialStore.kind,
        isPersistent: credentialStore.isPersistent,
      });
    },

    switchAccount: async (login) => {
      const target = get().accounts.find((account) => account.login === login);
      if (!target) {
        return;
      }
      setActive(login);
      set({
        account: target,
        epoch: get().epoch + 1,
        error: null,
      });
      queryClient.clear();
    },

    removeAccount: async (login) => {
      await credentialStore.deleteToken(githubProviderInstance.id, login);
      const remaining = get().accounts.filter((account) => account.login !== login);
      const wasActive = get().account?.login === login;

      if (remaining.length === 0) {
        setActive(null);
        set({
          status: "unauthenticated",
          accounts: [],
          account: null,
          epoch: get().epoch + 1,
        });
        queryClient.clear();
        return;
      }

      const nextActive = wasActive ? remaining[0] ?? null : get().account;
      if (wasActive) {
        setActive(nextActive?.login ?? null);
      }
      set({
        accounts: remaining,
        account: nextActive,
        epoch: get().epoch + 1,
      });
      queryClient.clear();
    },

    signOut: async (accountLogin) => {
      await get().removeAccount(accountLogin);
    },

    clearError: () => set({ error: null }),
  };
});
