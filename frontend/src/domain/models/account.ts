/**
 * Provider account session used by the auth store.
 * The access token is intentionally kept out of this model;
 * it lives only in the CredentialStore.
 */
export interface Account {
  readonly providerId: string;
  readonly login: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly scopes: readonly string[];
  readonly createdAt: string;
}

/** Identifies a provider instance in the registry (e.g. "github"). */
export type ProviderId = string;
