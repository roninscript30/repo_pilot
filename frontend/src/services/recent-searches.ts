import { loadPreference, savePreference } from "./user-preferences";

const RECENT_SEARCHES_KEY = "recent-searches" as const;
const MAX_SEARCHES = 5;

/** Recently performed global searches (most recent first). */
export function getRecentSearches(): readonly string[] {
  return loadPreference<readonly string[]>(RECENT_SEARCHES_KEY, []);
}

/** Record a global search query. */
export function recordRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const current = getRecentSearches();
  savePreference(RECENT_SEARCHES_KEY, [trimmed, ...current.filter((item) => item !== trimmed)].slice(0, MAX_SEARCHES));
}
