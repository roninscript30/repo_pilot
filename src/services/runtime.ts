import type { CredentialStore } from "@/domain/ports/credential-store";
import type { GitRuntime } from "@/domain/ports/git-runtime";
import type { Provider } from "@/domain/ports/provider";
import { GitHubApiClient } from "@/providers/github/api";
import { GitHubProvider } from "@/providers/github/provider";
import { MemoryCredentialStore } from "./credential-store-memory";
import { TauriCredentialStore } from "./credential-store-tauri";
import { WebFallbackGitRuntime } from "./git-runtime-web";
import { TauriGitRuntime } from "./git-runtime-tauri";

/** True when the app runs inside the native Tauri shell. */
export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in window &&
    typeof window.__TAURI_INTERNALS__ === "object"
  );
}

/** Active credential store: OS keyring in desktop, memory in browser. */
export function resolveCredentialStore(): CredentialStore {
  return isTauriRuntime()
    ? new TauriCredentialStore()
    : new MemoryCredentialStore();
}

/** Active local Git runtime: gitoxide backend in desktop, transparent fallback in browser. */
export function resolveGitRuntime(): GitRuntime {
  return isTauriRuntime() ? new TauriGitRuntime() : new WebFallbackGitRuntime();
}

/**
 * Build the GitHub provider bound to the active credential store.
 * The provider resolves its token lazily via the store, so the same
 * instance can serve any authenticated account.
 */
export function resolveProvider(store: CredentialStore): Provider {
  const client = new GitHubApiClient(async () => {
    const accounts = await store.listAccounts("github");
    if (accounts.length === 0) {
      return null;
    }
    return store.getToken("github", accounts[0] ?? "");
  });
  return new GitHubProvider(client);
}

export type { Provider, CredentialStore, GitRuntime };
