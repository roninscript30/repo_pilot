import { loadPreference, savePreference } from "@/services/user-preferences";

const RECENT_KEY = "recent-repositories" as const;
const MAX_RECENT = 8;

/** Recently visited repositories (most recent first). */
export function getRecentRepositories(): readonly string[] {
  return loadPreference<readonly string[]>(RECENT_KEY, []);
}

/** Record a repository visit; keeps at most MAX_RECENT entries. */
export function visitRepository(fullName: string) {
  const current = getRecentRepositories();
  const without = current.filter((name) => name !== fullName);
  savePreference(RECENT_KEY, [fullName, ...without].slice(0, MAX_RECENT));
}
