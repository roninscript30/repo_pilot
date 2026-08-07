import { afterEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({ isTauri: false }));
const eventApi = vi.hoisted(() => ({ listen: vi.fn() }));

vi.mock("./runtime", () => ({
  isTauriRuntime: () => runtime.isTauri,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (event: string, handler: (payload: unknown) => void) =>
    eventApi.listen(event, handler),
}));

import { onGitProgress, onRepoChanged } from "./git-events";

describe("git events service", () => {
  afterEach(() => {
    runtime.isTauri = false;
    eventApi.listen.mockClear();
  });

  it("returns null outside the Tauri shell", async () => {
    runtime.isTauri = false;
    expect(await onGitProgress(() => undefined)).toBeNull();
    expect(await onRepoChanged(() => undefined)).toBeNull();
    expect(eventApi.listen).not.toHaveBeenCalled();
  });

  it("subscribes to git://progress and forwards payloads in the Tauri shell", async () => {
    runtime.isTauri = true;
    const handler = vi.fn();
    eventApi.listen.mockImplementation((_event: string, cb: (message: unknown) => void) => {
      cb({ payload: { operationId: "op-1", phase: "Receiving objects", percent: 50, text: "50%" } });
      return Promise.resolve(() => undefined);
    });
    const unlisten = await onGitProgress(handler);
    expect(unlisten).not.toBeNull();
    expect(eventApi.listen).toHaveBeenCalledWith("git://progress", expect.any(Function));
    expect(handler).toHaveBeenCalledWith({
      operationId: "op-1",
      phase: "Receiving objects",
      percent: 50,
      text: "50%",
    });
  });

  it("subscribes to git://repo-changed and forwards the path", async () => {
    runtime.isTauri = true;
    const handler = vi.fn();
    eventApi.listen.mockImplementation((_event: string, cb: (message: unknown) => void) => {
      cb({ payload: { path: "/home/you/repo" } });
      return Promise.resolve(() => undefined);
    });
    await onRepoChanged(handler);
    expect(eventApi.listen).toHaveBeenCalledWith("git://repo-changed", expect.any(Function));
    expect(handler).toHaveBeenCalledWith({ path: "/home/you/repo" });
  });
});
