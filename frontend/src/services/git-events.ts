import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isTauriRuntime } from "./runtime";

/** Progress event streamed by the backend during a network Git operation. */
export interface GitProgressEvent {
  readonly operationId: string;
  readonly phase: string;
  readonly percent: number | null;
  readonly text: string;
}

/** Emitted when a watched repository's working tree changes on disk. */
export interface RepoChangedEvent {
  readonly path: string;
}

/**
 * Subscribe to `git://progress` events. Returns an unlisten handle, or null
 * outside the Tauri shell (browser preview has no backend events).
 */
export async function onGitProgress(
  handler: (event: GitProgressEvent) => void,
): Promise<UnlistenFn | null> {
  if (!isTauriRuntime()) return null;
  return listen<GitProgressEvent>("git://progress", (event) => handler(event.payload));
}

/**
 * Subscribe to `git://repo-changed` events. Returns an unlisten handle, or
 * null outside the Tauri shell.
 */
export async function onRepoChanged(
  handler: (event: RepoChangedEvent) => void,
): Promise<UnlistenFn | null> {
  if (!isTauriRuntime()) return null;
  return listen<RepoChangedEvent>("git://repo-changed", (event) => handler(event.payload));
}
