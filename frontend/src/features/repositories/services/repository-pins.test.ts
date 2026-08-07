import { beforeEach, describe, expect, it } from "vitest";
import {
  getPinnedRepositoryNames,
  isPinnedRepository,
  toggleRepositoryPin,
} from "./repository-pins";

describe("repository pins", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", () => {
    expect(getPinnedRepositoryNames()).toEqual([]);
  });

  it("pins a repository", () => {
    expect(toggleRepositoryPin("octocat/hello")).toBe(true);
    expect(isPinnedRepository("octocat/hello")).toBe(true);
    expect(getPinnedRepositoryNames()).toEqual(["octocat/hello"]);
  });

  it("unpins a repository", () => {
    toggleRepositoryPin("octocat/hello");
    expect(toggleRepositoryPin("octocat/hello")).toBe(false);
    expect(isPinnedRepository("octocat/hello")).toBe(false);
    expect(getPinnedRepositoryNames()).toEqual([]);
  });

  it("keeps pin state per repository", () => {
    toggleRepositoryPin("octocat/hello");
    toggleRepositoryPin("octocat/world");
    expect(getPinnedRepositoryNames()).toEqual(["octocat/hello", "octocat/world"]);
    expect(isPinnedRepository("octocat/hello")).toBe(true);
    expect(isPinnedRepository("unknown/repo")).toBe(false);
  });

  it("ignores corrupt localStorage payloads", () => {
    localStorage.setItem("repoPilot.pinnedRepositories", "{not json");
    expect(getPinnedRepositoryNames()).toEqual([]);
  });

  it("filters non-string entries", () => {
    localStorage.setItem(
      "repoPilot.pinnedRepositories",
      JSON.stringify(["octocat/hello", 42, null, "octocat/world"]),
    );
    expect(getPinnedRepositoryNames()).toEqual(["octocat/hello", "octocat/world"]);
  });
});
