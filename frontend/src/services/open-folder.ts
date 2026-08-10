import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "./runtime";

/**
 * Open a linked local working-tree folder in the system file manager.
 *
 * Desktop shell: the `open_folder` Rust command hands the path to the
 * platform opener after validating it exists. Browser preview has no file
 * manager, so this resolves to false and callers show a message instead.
 */
export async function openLocalFolder(path: string): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  try {
    await invoke("open_folder", { path });
    return true;
  } catch {
    return false;
  }
}
