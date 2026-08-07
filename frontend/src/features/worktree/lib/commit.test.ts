import { beforeEach, describe, expect, it } from "vitest";
import {
  loadCommitTemplates,
  removeCommitTemplate,
  saveCommitTemplate,
  SUBJECT_MAX_LENGTH,
  validateCommitMessage,
} from "./commit";

describe("commit message validation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("flags an empty message", () => {
    expect(validateCommitMessage("")).toEqual({
      empty: true,
      subjectTooLong: false,
      wip: false,
    });
    expect(validateCommitMessage("   \n")).toEqual({
      empty: true,
      subjectTooLong: false,
      wip: false,
    });
  });

  it("flags an over-long subject line", () => {
    const subject = "x".repeat(SUBJECT_MAX_LENGTH + 1);
    const issues = validateCommitMessage(`${subject}\n\nBody.`);
    expect(issues.subjectTooLong).toBe(true);
    expect(issues.empty).toBe(false);
  });

  it("allows a subject at the recommended maximum", () => {
    const subject = "x".repeat(SUBJECT_MAX_LENGTH);
    expect(validateCommitMessage(subject).subjectTooLong).toBe(false);
  });

  it("hints when the subject looks like work in progress", () => {
    expect(validateCommitMessage("WIP: tweak the sidebar").wip).toBe(true);
    expect(validateCommitMessage("wip tweak").wip).toBe(true);
    expect(validateCommitMessage("work in progress: styles").wip).toBe(true);
  });

  it("accepts a clean conventional commit", () => {
    expect(validateCommitMessage("feat: add the sync center")).toEqual({
      empty: false,
      subjectTooLong: false,
      wip: false,
    });
  });
});

describe("commit templates", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty and persists templates across reloads", () => {
    expect(loadCommitTemplates()).toEqual([]);
    saveCommitTemplate({
      name: "Feat",
      message: "feat: <summary>\n\n<body>",
    });
    saveCommitTemplate({
      name: "Fix",
      message: "fix: <summary>",
    });
    expect(loadCommitTemplates().map((t) => t.name)).toEqual(["Feat", "Fix"]);
  });

  it("replaces a template with the same name", () => {
    saveCommitTemplate({ name: "Feat", message: "feat: one" });
    saveCommitTemplate({ name: "Feat", message: "feat: two" });
    const templates = loadCommitTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0]?.message).toBe("feat: two");
  });

  it("removes a template by name", () => {
    saveCommitTemplate({ name: "Feat", message: "feat: one" });
    saveCommitTemplate({ name: "Fix", message: "fix: two" });
    removeCommitTemplate("Feat");
    expect(loadCommitTemplates().map((t) => t.name)).toEqual(["Fix"]);
  });

  it("ignores malformed stored entries", () => {
    localStorage.setItem(
      "repoPilot:preferences",
      JSON.stringify({ "commit.templates": [{ name: "ok", message: "msg" }, { name: "no message" }, null] }),
    );
    expect(loadCommitTemplates().map((t) => t.name)).toEqual(["ok"]);
  });
});
