import { create } from "zustand";
import { loadPreference, savePreference } from "@/services/user-preferences";

export type ThemePreference = "light" | "dark";

interface ThemeState {
  readonly theme: ThemePreference;
  setTheme(theme: ThemePreference): void;
  toggleTheme(): void;
}

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

const PREFERENCE_KEY = "theme" as const;

/** Theme store. Persists to localStorage and applies the .dark class. */
export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: (() => {
    const stored = loadPreference<ThemePreference>(PREFERENCE_KEY, "light");
    const resolved: ThemePreference =
      stored === "light" || stored === "dark" ? stored : "light";
    applyTheme(resolved);
    return resolved;
  })(),

  setTheme: (theme) => {
    applyTheme(theme);
    savePreference(PREFERENCE_KEY, theme);
    set({ theme });
  },

  toggleTheme: () => {
    const next: ThemePreference = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
  },
}));
