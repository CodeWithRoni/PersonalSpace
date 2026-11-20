// Simple persistent store. localStorage works in the browser and inside the Tauri webview
// on every platform. Swap this module for tauri-plugin-sql / a sync backend later
// without touching the UI.

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`ps:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`ps:${key}`, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
}
