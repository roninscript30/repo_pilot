/** Organization membership as seen by a provider. */
export interface Organization {
  readonly login: string;
  readonly avatarUrl: string | null;
  readonly description: string | null;
}
