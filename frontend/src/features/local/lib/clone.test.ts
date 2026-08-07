import { describe, expect, it } from "vitest";
import { repoFullNameFromUrl, repoNameFromUrl } from "./clone";

describe("clone URL helpers", () => {
  it("derives a directory name from a clone URL", () => {
    expect(repoNameFromUrl("https://github.com/octocat/hello-world.git")).toBe("hello-world");
    expect(repoNameFromUrl("https://github.com/octocat/hello-world")).toBe("hello-world");
    expect(repoNameFromUrl("https://github.com/octocat/hello-world/")).toBe("hello-world");
    expect(repoNameFromUrl("git@github.com:octocat/hello-world.git")).toBe("hello-world");
    expect(repoNameFromUrl("")).toBe("repository");
    expect(repoNameFromUrl("https://github.com/octocat/Hello.World.GIT")).toBe("Hello.World");
  });

  it("derives the GitHub full name from HTTPS and SSH URLs", () => {
    expect(repoFullNameFromUrl("https://github.com/octocat/hello-world.git")).toBe(
      "octocat/hello-world",
    );
    expect(repoFullNameFromUrl("https://github.com/octocat/hello-world")).toBe(
      "octocat/hello-world",
    );
    expect(repoFullNameFromUrl("git@github.com:octocat/hello-world.git")).toBe(
      "octocat/hello-world",
    );
  });

  it("returns null for non-GitHub URLs", () => {
    expect(repoFullNameFromUrl("https://gitlab.com/octocat/hello.git")).toBeNull();
    expect(repoFullNameFromUrl("https://example.com/octocat/hello.git")).toBeNull();
    expect(repoFullNameFromUrl("")).toBeNull();
  });
});
