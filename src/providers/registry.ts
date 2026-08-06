import type { CredentialStore } from "@/domain/ports/credential-store";
import type { Provider } from "@/domain/ports/provider";
import { resolveCredentialStore, resolveProvider } from "@/services/runtime";

/**
 * Application-wide provider registry.
 *
 * Single source of truth for provider instances and the active
 * credential store, so the store used at sign-in is the same store
 * the provider reads tokens from later.
 */
class ProviderRegistry {
  private readonly credentialStore: CredentialStore = resolveCredentialStore();
  private readonly providers = new Map<string, Provider>();

  /** The GitHub provider bound to the active credential store. */
  githubProvider(): Provider {
    const existing = this.providers.get("github");
    if (existing) {
      return existing;
    }
    const provider = resolveProvider(this.credentialStore);
    this.providers.set("github", provider);
    return provider;
  }

  /** The active credential store (keyring in desktop, memory in browser). */
  getCredentialStore(): CredentialStore {
    return this.credentialStore;
  }
}

export const providerRegistry = new ProviderRegistry();
