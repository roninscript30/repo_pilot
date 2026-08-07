import type { CredentialStore } from "@/domain/ports/credential-store";

/**
 * Browser-preview credential store.
 *
 * Holds tokens in memory only. Nothing is ever written to
 * localStorage or any durable storage (ADR-0005). Closing the tab
 * clears all sessions.
 */
export class MemoryCredentialStore implements CredentialStore {
  readonly kind = "memory" as const;
  readonly isPersistent = false;

  private readonly tokens = new Map<string, string>();

  private key(providerId: string, accountLogin: string): string {
    return `${providerId}:${accountLogin}`;
  }

  async setToken(providerId: string, accountLogin: string, token: string): Promise<boolean> {
    this.tokens.set(this.key(providerId, accountLogin), token);
    return true;
  }

  async getToken(providerId: string, accountLogin: string): Promise<string | null> {
    return this.tokens.get(this.key(providerId, accountLogin)) ?? null;
  }

  async deleteToken(providerId: string, accountLogin: string): Promise<void> {
    this.tokens.delete(this.key(providerId, accountLogin));
  }

  async listAccounts(providerId: string): Promise<readonly string[]> {
    return [...this.tokens.keys()]
      .filter((key) => key.startsWith(`${providerId}:`))
      .map((key) => key.slice(providerId.length + 1));
  }
}
