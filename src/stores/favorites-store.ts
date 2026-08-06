import { create } from "zustand";
import { loadPreference, savePreference } from "@/services/user-preferences";

const FAVORITES_KEY = "favorite-repositories" as const;

interface FavoritesState {
  readonly favorites: readonly string[];
  readonly toggleFavorite: (fullName: string) => boolean;
  readonly isFavorite: (fullName: string) => boolean;
}

/** Favorited repositories, persisted locally (independent of provider pins). */
export const useFavoritesStore = create<FavoritesState>()((set, get) => ({
  favorites: loadPreference<readonly string[]>(FAVORITES_KEY, []),

  toggleFavorite: (fullName) => {
    const current = get().favorites;
    const next = current.includes(fullName)
      ? current.filter((name) => name !== fullName)
      : [...current, fullName];
    savePreference(FAVORITES_KEY, next);
    set({ favorites: next });
    return next.includes(fullName);
  },

  isFavorite: (fullName) => get().favorites.includes(fullName),
}));
