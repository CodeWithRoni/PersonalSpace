import { isTauri } from "@tauri-apps/api/core";

/** Opens a link in the system browser (desktop/mobile) or a new tab (web). */
export async function openLink(url: string) {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
