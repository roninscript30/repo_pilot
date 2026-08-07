import { isTauriRuntime } from "./runtime";

/**
 * Open an http(s) URL in the system browser.
 *
 * In the desktop shell a small Rust command (`open_external`) hands the
 * URL to the platform opener. In browser preview, falls back to a
 * targeted popup. Throws when the browser blocks the popup.
 */
export async function openExternal(url: string): Promise<void> {
  if (isTauriRuntime()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("open_external", { url });
      return;
    } catch {
      // Desktop opener unavailable: fall through to the popup attempt.
    }
  }
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    throw new Error("Your browser blocked the sign-in window. Open the URL manually.");
  }
}
