const PREFERENCES_KEY = "gitos:preferences" as const;

interface Preferences {
  [key: string]: unknown;
}

function readPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    return raw ? (JSON.parse(raw) as Preferences) : {};
  } catch {
    return {};
  }
}

function writePreferences(preferences: Preferences) {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Storage unavailable (private mode, quota): preferences just won't persist.
  }
}

/** Read a persisted UI preference with a fallback. */
export function loadPreference<T>(key: string, fallback: T): T {
  const value = readPreferences()[key];
  return value === undefined ? fallback : (value as T);
}

/** Persist a UI preference. Safe against storage failures. */
export function savePreference(key: string, value: unknown) {
  const preferences = readPreferences();
  preferences[key] = value;
  writePreferences(preferences);
}
