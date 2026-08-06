/**
 * Storage port for provider access tokens.
 *
 * Desktop implementation: OS keyring (macOS Keychain, Windows
 * Credential Manager, Linux Secret Service) via the Tauri backend.
 *
 * Browser-preview implementation: in-memory only. Defaults are
 * never persisted, including localStorage.
 */
export interface CredentialStore {
  readonly kind: "keyring" | "memory";

  /** Store a token for a provider account. Resolves to false if denied. */
  setToken(providerId: string, accountLogin: string, token: string): Promise<boolean>;

  /** Retrieve a stored token, or null when absent. */
  getToken(providerId: string, accountLogin: string): Promise<string | null>;

  /** Remove a stored token. */
  deleteToken(providerId: string, accountLogin: string): Promise<void>;

  /** List account logins that have stored tokens for a provider. */
  listAccounts(providerId: string): Promise<readonly string[]>;

  /** Whether the store supports persistence given the current runtime. */
  readonly isPersistent: boolean;
}

export const CREDENTIAL_KIND_LABELS: Record<CredentialStore["kind"], string> = {
  keyring: "OS keyring",
  memory: "in-memory (not persisted)",
};
