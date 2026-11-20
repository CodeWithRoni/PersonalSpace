/** Adds https:// when missing and validates. Returns null for anything that isn't a web URL. */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw || /\s/.test(raw)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (!["http:", "https:"].includes(u.protocol) || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Stable hue per domain, used for each card's colour spine. */
export function hueFor(domain: string): number {
  let h = 0;
  for (let i = 0; i < domain.length; i++) h = (h * 31 + domain.charCodeAt(i)) % 320;
  // Skip the yellow band (50–90°) where white text loses contrast.
  return h < 50 ? h : h + 40;
}

/** A readable fallback title from a URL: "github.com/tauri-apps" → "github.com / tauri-apps". */
export function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.split("/").filter(Boolean).slice(0, 2).join(" / ");
    const host = u.hostname.replace(/^www\./, "");
    return path ? `${host} / ${decodeURIComponent(path)}` : host;
  } catch {
    return url;
  }
}

/** "app.textverified.com" → "textverified.com", "news.bbc.co.uk" → "bbc.co.uk" */
export function rootDomain(host: string): string {
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  const keep = tld.length === 2 && sld.length <= 3 ? 3 : 2;
  return parts.slice(-keep).join(".");
}
