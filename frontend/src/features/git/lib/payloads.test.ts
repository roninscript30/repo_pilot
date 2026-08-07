import { describe, expect, it } from "vitest";
import {
  checkoutPayload,
  cherryPickPayload,
  clonePayload,
  commitPayload,
  compareBranchesPayload,
  createBranchPayload,
  createTagPayload,
  deleteBranchPayload,
  deleteTagPayload,
  fetchPayload,
  mergePayload,
  pullPayload,
  pushPayload,
  rebasePayload,
  renameBranchPayload,
  resetPayload,
  restorePayload,
  revertPayload,
  squashMergePayload,
  stagePayload,
  stashPayload,
  unstagePayload,
} from "./payloads";

describe("git operation payload builders", () => {
  it("stage/unstage/restore carry the file list", () => {
    expect(stagePayload(["a", "b"])).toEqual({ paths: ["a", "b"] });
    expect(unstagePayload(["a"])).toEqual({ paths: ["a"] });
    expect(restorePayload(["a"])).toEqual({ files: ["a"] });
  });

  it("commit payload omits optional flags unless set", () => {
    expect(commitPayload("msg")).toEqual({ message: "msg" });
    expect(commitPayload("msg", { amend: true, signed: true })).toEqual({
      message: "msg",
      amend: true,
      signed: true,
    });
    expect(commitPayload("msg", { empty: true })).toEqual({ message: "msg", empty: true });
  });

  it("create-branch supports an optional start point", () => {
    expect(createBranchPayload("feat")).toEqual({ name: "feat" });
    expect(createBranchPayload("feat", { startPoint: "main" })).toEqual({
      name: "feat",
      startPoint: "main",
    });
  });

  it("delete/rename/checkout branch shapes", () => {
    expect(deleteBranchPayload("feat")).toEqual({ branch: "feat" });
    expect(deleteBranchPayload("feat", true)).toEqual({ branch: "feat", force: true });
    expect(renameBranchPayload("old", "new")).toEqual({ oldName: "old", newName: "new" });
    expect(checkoutPayload("main")).toEqual({ branch: "main" });
    expect(checkoutPayload("feat", { create: true, startPoint: "main" })).toEqual({
      branch: "feat",
      create: true,
      startPoint: "main",
    });
  });

  it("reset defaults to mixed and keeps target optional", () => {
    expect(resetPayload("hard")).toEqual({ mode: "hard" });
    expect(resetPayload("soft", "HEAD~1")).toEqual({ mode: "soft", target: "HEAD~1" });
  });

  it("tag and stash payloads", () => {
    expect(createTagPayload("v1")).toEqual({ tag: "v1" });
    expect(createTagPayload("v1", { message: "release" })).toEqual({ tag: "v1", message: "release" });
    expect(deleteTagPayload("v1")).toEqual({ tag: "v1" });
    expect(stashPayload("push", { message: "wip" })).toEqual({ action: "push", message: "wip" });
    expect(stashPayload("drop", { stash: "stash@{0}" })).toEqual({ action: "drop", stash: "stash@{0}" });
    expect(stashPayload("list")).toEqual({ action: "list" });
  });

  it("cherry-pick/revert/rebase/merge/squash/compare shapes", () => {
    expect(cherryPickPayload("abc123")).toEqual({ commit: "abc123" });
    expect(revertPayload("abc123")).toEqual({ commit: "abc123" });
    expect(rebasePayload("main")).toEqual({ target: "main" });
    expect(mergePayload("feat")).toEqual({ branch: "feat" });
    expect(squashMergePayload("feat")).toEqual({ branch: "feat" });
    expect(compareBranchesPayload("feat")).toEqual({ branch: "feat" });
  });

  it("network payloads only include provided options", () => {
    expect(pushPayload()).toEqual({});
    expect(pushPayload("origin", { setUpstream: true, accountLogin: "octocat" })).toEqual({
      remote: "origin",
      setUpstream: true,
      accountLogin: "octocat",
    });
    expect(pullPayload("origin", { rebase: true })).toEqual({ remote: "origin", rebase: true });
    expect(fetchPayload("origin")).toEqual({ remote: "origin" });
  });

  it("clone payload always carries identity and optional knobs", () => {
    const base = clonePayload("https://github.com/octocat/hello.git", "/tmp/x", "op-1");
    expect(base).toEqual({
      url: "https://github.com/octocat/hello.git",
      targetDir: "/tmp/x",
      operationId: "op-1",
    });
    const withOptions = clonePayload("u", "d", "op", {
      depth: 1,
      branch: "main",
      accountLogin: "octocat",
    });
    expect(withOptions).toEqual({
      url: "u",
      targetDir: "d",
      operationId: "op",
      depth: 1,
      branch: "main",
      accountLogin: "octocat",
    });
  });
});
