import { beforeEach, describe, expect, it } from "vitest";
import { MemoryCredentialStore } from "./credential-store-memory";

describe("MemoryCredentialStore", () => {
  let store: MemoryCredentialStore;

  beforeEach(() => {
    store = new MemoryCredentialStore();
  });

  it("advertises an in-memory, non-persistent kind", () => {
    expect(store.kind).toBe("memory");
    expect(store.isPersistent).toBe(false);
  });

  it("stores and retrieves tokens per provider and account", async () => {
    expect(await store.setToken("github", "octocat", "ghp_secret")).toBe(true);
    expect(await store.getToken("github", "octocat")).toBe("ghp_secret");
  });

  it("returns null for unknown accounts", async () => {
    expect(await store.getToken("github", "nobody")).toBeNull();
  });

  it("isolates accounts across providers", async () => {
    await store.setToken("github", "octocat", "ghp_a");
    await store.setToken("gitlab", "octocat", "gl_a");
    expect(await store.getToken("github", "octocat")).toBe("ghp_a");
    expect(await store.getToken("gitlab", "octocat")).toBe("gl_a");
  });

  it("overwrites tokens for the same account", async () => {
    await store.setToken("github", "octocat", "old");
    await store.setToken("github", "octocat", "new");
    expect(await store.getToken("github", "octocat")).toBe("new");
  });

  it("lists accounts per provider", async () => {
    await store.setToken("github", "octocat", "a");
    await store.setToken("github", "hubot", "b");
    await store.setToken("gitlab", "octocat", "c");
    expect(await store.listAccounts("github")).toEqual(["octocat", "hubot"]);
    expect(await store.listAccounts("gitlab")).toEqual(["octocat"]);
    expect(await store.listAccounts("bitbucket")).toEqual([]);
  });

  it("deletes tokens and removes them from the account list", async () => {
    await store.setToken("github", "octocat", "a");
    await store.deleteToken("github", "octocat");
    expect(await store.getToken("github", "octocat")).toBeNull();
    expect(await store.listAccounts("github")).toEqual([]);
  });
});
