import { invoke, isTauri } from "@tauri-apps/api/core";

export type Runtime = "desktop" | "mobile" | "web";

export interface AppInfo {
  runtime: Runtime;
  os: string;
  version: string;
}

/** Works everywhere: asks Rust when running inside Tauri, falls back to the browser otherwise. */
export async function getAppInfo(): Promise<AppInfo> {
  if (isTauri()) {
    return invoke<AppInfo>("app_info");
  }
  return { runtime: "web", os: navigator.platform || "browser", version: __APP_VERSION__ };
}

export { isTauri };
