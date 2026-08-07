const PINNED_REPOSITORIES_KEY = "repoPilot.pinnedRepositories";

/** Read the pinned repository full names from the pins store. */
export function getPinnedRepositoryNames(): readonly string[] {
  const raw = localStorage.getItem(PINNED_REPOSITORIES_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // Corrupt pins are ignored; the user can pin again.
  }
  return [];
}

/** True when the full name is currently pinned. */
export function isPinnedRepository(fullName: string): boolean {
  return getPinnedRepositoryNames().includes(fullName);
}

/** Toggle pin state for a repository full name. Returns the new state. */
export function toggleRepositoryPin(fullName: string): boolean {
  const current = getPinnedRepositoryNames();
  const next = current.includes(fullName)
    ? current.filter((name) => name !== fullName)
    : [...current, fullName];
  localStorage.setItem(PINNED_REPOSITORIES_KEY, JSON.stringify(next));
  return !current.includes(fullName);
}

/**
 * NOTE: Pin state is UI-local preference data and is intentionally small
 * and non-secret. It is stored in localStorage. Access tokens never are.
 * See ADR-0005 for the secret storage policy.
 */
