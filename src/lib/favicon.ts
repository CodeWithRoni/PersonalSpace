// Finds the best real icon for a site. Tries several sources in order and
// rejects placeholder images (e.g. Google's 16px globe for unknown sites).
// Results are cached on the device so each domain is only looked up once.

import { load, save } from "./storage";

type Entry = { src: string | null; at: number };
const MISS_TTL = 3 * 864e5; // retry sites without an icon after 3 days

const cache: Record<string, Entry> = load("favicons", {});
const pending = new Map<string, Promise<string | null>>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save("favicons", cache), 500);
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

function candidates(host: string): string[] {
  const hosts = [host, rootDomain(host)].filter((h, i, a) => a.indexOf(h) === i);
  return hosts.flatMap((h) => [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${h}.ico`,
    `https://${h}/apple-touch-icon.png`,
    `https://${h}/favicon.ico`,
  ]);
}

/** Loads an image and accepts it only if it looks like a real icon. */
function probe(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = (ok: boolean) => {
      clearTimeout(t);
      img.onload = img.onerror = null;
      resolve(ok);
    };
    const t = setTimeout(() => done(false), 6000);
    img.onload = () => {
      const w = img.naturalWidth;
      // Google answers unknown sites with a 16px globe even when 128px is requested.
      const isGooglePlaceholder = src.includes("google.com/s2/") && w <= 16;
      done(w > 1 && !isGooglePlaceholder);
    };
    img.onerror = () => done(false);
    img.referrerPolicy = "no-referrer";
    img.src = src;
  });
}

export function cachedIcon(host: string): string | null | undefined {
  const e = cache[host];
  if (!e) return undefined;
  if (!e.src && Date.now() - e.at > MISS_TTL) return undefined;
  return e.src;
}

export function findIcon(host: string): Promise<string | null> {
  const hit = cachedIcon(host);
  if (hit !== undefined) return Promise.resolve(hit);
  const running = pending.get(host);
  if (running) return running;

  const job = (async () => {
    for (const src of candidates(host)) {
      if (await probe(src)) {
        cache[host] = { src, at: Date.now() };
        persist();
        return src;
      }
    }
    // Only remember a miss when we're online; offline failures shouldn't stick.
    if (navigator.onLine) {
      cache[host] = { src: null, at: Date.now() };
      persist();
    }
    return null;
  })().finally(() => pending.delete(host));

  pending.set(host, job);
  return job;
}
