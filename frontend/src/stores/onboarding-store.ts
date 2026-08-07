import { create } from "zustand";
import { loadPreference, savePreference } from "@/services/user-preferences";

const ONBOARDING_KEY = "onboarding-completed" as const;

interface OnboardingState {
  readonly completed: boolean;
  readonly complete: () => void;
}

/** First-run onboarding completion flag (persisted). */
export const useOnboardingStore = create<OnboardingState>()((set) => ({
  completed: loadPreference<boolean>(ONBOARDING_KEY, false) === true,
  complete: () => {
    savePreference(ONBOARDING_KEY, true);
    set({ completed: true });
  },
}));
