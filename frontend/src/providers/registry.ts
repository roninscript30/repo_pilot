import type { CredentialStore } from "@/domain/ports/credential-store";
import type { Provider } from "@/domain/ports/provider";
import { resolveCredentialStore, resolveProvider } from "@/services/runtime";

/**
 * Application-wide provider registry.
 *
 * Single source of truth for provider instances and the active
 * credential store, so the store used at sign-in is the same store
 * the provider reads tokens from later.
 *
 * The registry keeps one provider instance per connected account, keyed
 * by `github:<login>`, plus a fallback instance used before an active
 * account is chosen. The auth store calls `setActiveAccount` when the
 * active account changes; every existing `githubProvider()` call site
 * then resolves to the provider bound to that account's token.
 */
class ProviderRegistry {
  private readonly credentialStore: CredentialStore = resolveCredentialStore();
  private readonly providers = new Map<string, Provider>();
  private activeAccountLogin: string | null = null;

  /** Point future `githubProvider()` resolutions at one account's token. */
  setActiveAccount(login: string | null): void {
    this.activeAccountLogin = login;
  }

  /** The GitHub provider bound to the active account (or the first stored). */
  githubProvider(): Provider {
    const key = this.activeAccountLogin === null ? "github" : `github:${this.activeAccountLogin}`;
    const existing = this.providers.get(key);
    if (existing) {
      return existing;
    }
    const provider = resolveProvider(this.credentialStore, this.activeAccountLogin);
    this.providers.set(key, provider);
    return provider;
  }

  /** The active credential store (keyring in desktop, memory in browser). */
  getCredentialStore(): CredentialStore {
    return this.credentialStore;
  }
}

export const providerRegistry = new ProviderRegistry();
