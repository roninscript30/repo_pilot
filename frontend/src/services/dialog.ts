import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "./runtime";

/**
 * Ask the user for a directory using the native folder picker.
 *
 * Returns the chosen absolute path, or null when cancelled. In browser
 * preview there is no native dialog, so this resolves to null.
 */
export async function pickFolder(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  try {
    return await invoke<string | null>("pick_repository_folder");
  } catch {
    return null;
  }
}
