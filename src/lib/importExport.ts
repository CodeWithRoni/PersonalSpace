import type { Bookmark, Collection } from "../types";
import { normalizeUrl } from "./url";

export interface Library {
  bookmarks: Bookmark[];
  collections: Collection[];
}

export const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 12);

export function exportJson(lib: Library) {
  const blob = new Blob([JSON.stringify({ app: "PersonalSpace", version: 1, ...lib }, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `personalspace-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/**
 * Reads a PersonalSpace JSON backup, or a bookmarks .html file exported from
 * Chrome / Edge / Firefox / Safari (Netscape format). Browser folders become collections.
 */
export async function importFile(file: File, existing: Library): Promise<Library> {
  const text = await file.text();
  if (file.name.endsWith(".json")) {
    const data = JSON.parse(text) as Partial<Library>;
    return {
      bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
      collections: Array.isArray(data.collections) ? data.collections : [],
    };
  }

  const doc = new DOMParser().parseFromString(text, "text/html");
  const collections: Collection[] = [];
  const byName = new Map(existing.collections.map((c) => [c.name.toLowerCase(), c]));
  const bookmarks: Bookmark[] = [];

  doc.querySelectorAll("a[href]").forEach((a) => {
    const url = normalizeUrl(a.getAttribute("href") ?? "");
    if (!url) return;
    const heading = a.closest("dl")?.previousElementSibling;
    const folder = heading?.tagName === "H3" ? heading.textContent?.trim() : "";
    let collectionId: string | null = null;
    if (folder && !/^(bookmarks bar|bookmarks toolbar|favorites bar|other bookmarks)$/i.test(folder)) {
      let c = byName.get(folder.toLowerCase());
      if (!c) {
        c = { id: uid(), name: folder };
        byName.set(folder.toLowerCase(), c);
        collections.push(c);
      }
      collectionId = c.id;
    }
    const added = Number(a.getAttribute("add_date"));
    bookmarks.push({
      id: uid(),
      url,
      title: a.textContent?.trim() || url,
      description: "",
      collectionId,
      tags: [],
      favorite: false,
      createdAt: added ? added * 1000 : Date.now(),
    });
  });

  return { bookmarks, collections };
}
