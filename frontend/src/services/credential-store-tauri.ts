import { invoke } from "@tauri-apps/api/core";
import type { CredentialStore } from "@/domain/ports/credential-store";

/**
 * Desktop credential store backed by the Tauri shell.
 *
 * Tokens live in the OS keyring via the Rust backend
 * (macOS Keychain / Windows Credential Manager / Linux Secret Service).
 *
 * When the app runs in a plain browser (no Tauri), every call resolves
 * to a non-persistent failure so no secret is ever exposed or stored.
 */
export class TauriCredentialStore implements CredentialStore {
  readonly kind = "keyring" as const;
  readonly isPersistent = true;

  private readonly available: boolean;

  constructor() {
    this.available = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  }

  private guard(): void {
    if (!this.available) {
      throw new Error(
        "OS keyring is not available in browser preview. Tokens are kept in memory only.",
      );
    }
  }

  async setToken(providerId: string, accountLogin: string, token: string): Promise<boolean> {
    this.guard();
    return invoke<boolean>("credential_set", {
      providerId,
      accountLogin,
      token,
    });
  }

  async getToken(providerId: string, accountLogin: string): Promise<string | null> {
    this.guard();
    const result = await invoke<string | null>("credential_get", {
      providerId,
      accountLogin,
    });
    return result;
  }

  async deleteToken(providerId: string, accountLogin: string): Promise<void> {
    this.guard();
    await invoke("credential_delete", { providerId, accountLogin });
  }

  async listAccounts(providerId: string): Promise<readonly string[]> {
    this.guard();
    const accounts = await invoke<string[]>("credential_list_accounts", { providerId });
    return accounts;
  }
}
