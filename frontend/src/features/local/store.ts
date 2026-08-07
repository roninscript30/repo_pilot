import { create } from "zustand";
import { loadPreference, savePreference } from "@/services/user-preferences";

const STORAGE_KEY = "local.repositories";

/** A tracked local Git working tree (the Local Repository Engine). */
export interface LocalRepository {
  readonly path: string;
  /** Linked remote repository (full name) when the origin URL matches. */
  readonly fullName: string | null;
  readonly pinned: boolean;
  readonly addedAt: string;
  readonly lastOpenedAt: string;
  /** Remote name → account login used to authenticate network operations. */
  readonly accountLogins: Readonly<Record<string, string>>;
}

interface LocalReposState {
  readonly repositories: readonly LocalRepository[];
  /**
   * Track a path. No-op when already tracked (returns the existing entry).
   * Marks the entry as just opened.
   */
  add(path: string, fullName?: string | null): LocalRepository;
  remove(path: string): void;
  togglePin(path: string): void;
  touch(path: string): void;
  /** Link or unlink a remote repository full name for a tracked path. */
  link(path: string, fullName: string | null): void;
  /** Remember which account authenticates a remote (e.g. "origin"). */
  setAccountLogin(path: string, remote: string, accountLogin: string): void;
}

function loadRepositories(): LocalRepository[] {
  const stored = loadPreference<unknown>(STORAGE_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((entry): entry is Partial<LocalRepository> => {
      if (entry === null || typeof entry !== "object") return false;
      const candidate = entry as Partial<LocalRepository>;
      return (
        typeof candidate.path === "string" &&
        (candidate.fullName === null || typeof candidate.fullName === "string") &&
        typeof candidate.pinned === "boolean" &&
        typeof candidate.addedAt === "string" &&
        typeof candidate.lastOpenedAt === "string"
      );
    })
    .map((candidate) => ({
      path: candidate.path!,
      fullName: candidate.fullName ?? null,
      pinned: candidate.pinned!,
      addedAt: candidate.addedAt!,
      lastOpenedAt: candidate.lastOpenedAt!,
      // Older entries predate per-remote account mapping; default to none.
      accountLogins: candidate.accountLogins ?? {},
    }));
}

function nowIso(): string {
  return new Date().toISOString();
}

/** The local repositories tracked by the workspace, persisted across launches. */
export const useLocalReposStore = create<LocalReposState>()((set, get) => ({
  repositories: loadRepositories(),

  add(path, fullName = null) {
    const { repositories } = get();
    const existing = repositories.find((entry) => entry.path === path);
    if (existing) {
      const updated = { ...existing, lastOpenedAt: nowIso() };
      const next = repositories.map((entry) =>
        entry.path === path ? updated : entry,
      );
      savePreference(STORAGE_KEY, next);
      set({ repositories: next });
      return updated;
    }
    const entry: LocalRepository = {
      path,
      fullName,
      pinned: false,
      addedAt: nowIso(),
      lastOpenedAt: nowIso(),
      accountLogins: {},
    };
    const next = [...repositories, entry];
    savePreference(STORAGE_KEY, next);
    set({ repositories: next });
    return entry;
  },

  remove(path: string) {
    const next = get().repositories.filter((entry) => entry.path !== path);
    savePreference(STORAGE_KEY, next);
    set({ repositories: next });
  },

  togglePin(path: string) {
    const next = get().repositories.map((entry) =>
      entry.path === path ? { ...entry, pinned: !entry.pinned } : entry,
    );
    savePreference(STORAGE_KEY, next);
    set({ repositories: next });
  },

  touch(path: string) {
    const next = get().repositories.map((entry) =>
      entry.path === path ? { ...entry, lastOpenedAt: nowIso() } : entry,
    );
    savePreference(STORAGE_KEY, next);
    set({ repositories: next });
  },

  link(path: string, fullName: string | null) {
    const next = get().repositories.map((entry) =>
      entry.path === path ? { ...entry, fullName } : entry,
    );
    savePreference(STORAGE_KEY, next);
    set({ repositories: next });
  },

  setAccountLogin(path: string, remote: string, accountLogin: string) {
    const next = get().repositories.map((entry) =>
      entry.path === path
        ? { ...entry, accountLogins: { ...entry.accountLogins, [remote]: accountLogin } }
        : entry,
    );
    savePreference(STORAGE_KEY, next);
    set({ repositories: next });
  },
}));

/** The tracked local path for a repository full name, if one is linked. */
export function localPathForFullName(fullName: string): string | null {
  const entry = useLocalReposStore
    .getState()
    .repositories.find((candidate) => candidate.fullName === fullName);
  return entry?.path ?? null;
}

/** The tracked local path exactly at `path` (canonical lookup). */
export function localRepositoryAt(path: string): LocalRepository | null {
  return (
    useLocalReposStore
      .getState()
      .repositories.find((entry) => entry.path === path) ?? null
  );
}
