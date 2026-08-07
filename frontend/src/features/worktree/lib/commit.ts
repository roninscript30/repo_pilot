import { loadPreference, savePreference } from "@/services/user-preferences";

/** Recommended maximum length of the commit subject line. */
export const SUBJECT_MAX_LENGTH = 72;

const WIP_PATTERNS = ["WIP", "wip", "work in progress"];

/** Which quality rules a commit message currently trips. */
export interface CommitMessageIssues {
  readonly empty: boolean;
  readonly subjectTooLong: boolean;
  readonly wip: boolean;
}

/** Commit message validation used by the Commit Center. */
export function validateCommitMessage(message: string): CommitMessageIssues {
  const subject = message.trim().split("\n")[0] ?? "";
  return {
    empty: message.trim().length === 0,
    subjectTooLong: subject.length > SUBJECT_MAX_LENGTH,
    wip: WIP_PATTERNS.some((pattern) => subject.includes(pattern)),
  };
}

/** A named, reusable commit message template. */
export interface CommitTemplate {
  readonly name: string;
  readonly message: string;
}

const TEMPLATES_KEY = "commit.templates";

function isTemplate(entry: unknown): entry is CommitTemplate {
  if (entry === null || typeof entry !== "object") return false;
  const candidate = entry as Partial<CommitTemplate>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.message === "string"
  );
}

/** Persisted templates for the commit message editor. */
export function loadCommitTemplates(): readonly CommitTemplate[] {
  const stored = loadPreference<unknown>(TEMPLATES_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter(isTemplate);
}

/** Save or replace a template by name; returns the new list. */
export function saveCommitTemplate(template: CommitTemplate): readonly CommitTemplate[] {
  const next = [
    ...loadCommitTemplates().filter((existing) => existing.name !== template.name),
    template,
  ];
  savePreference(TEMPLATES_KEY, next);
  return next;
}

/** Remove a template by name; returns the new list. */
export function removeCommitTemplate(name: string): readonly CommitTemplate[] {
  const next = loadCommitTemplates().filter((template) => template.name !== name);
  savePreference(TEMPLATES_KEY, next);
  return next;
}
