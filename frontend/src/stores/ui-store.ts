import { create } from "zustand";

interface UiState {
  readonly paletteOpen: boolean;
  readonly searchOpen: boolean;
  readonly notificationsOpen: boolean;
  readonly contextPanelOpen: boolean;
  setPaletteOpen(open: boolean): void;
  setSearchOpen(open: boolean): void;
  setNotificationsOpen(open: boolean): void;
  setContextPanelOpen(open: boolean): void;
  toggleContextPanel(): void;
}

/** Global overlay state for the app shell (palette, search, notifications). */
export const useUiStore = create<UiState>()((set) => ({
  paletteOpen: false,
  searchOpen: false,
  notificationsOpen: false,
  contextPanelOpen: true,
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),
  setContextPanelOpen: (open) => set({ contextPanelOpen: open }),
  toggleContextPanel: () => set((state) => ({ contextPanelOpen: !state.contextPanelOpen })),
}));
