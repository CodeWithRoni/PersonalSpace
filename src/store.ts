import { useCallback, useEffect, useState } from "react";
import type { Bookmark, BookmarkDraft, Collection } from "./types";
import { load, save } from "./lib/storage";
import { uid, type Library } from "./lib/importExport";

export function useLibrary() {
  const [lib, setLib] = useState<Library>(() => ({
    bookmarks: load<Bookmark[]>("bookmarks", []),
    collections: load<Collection[]>("collections", []),
  }));

  useEffect(() => save("bookmarks", lib.bookmarks), [lib.bookmarks]);
  useEffect(() => save("collections", lib.collections), [lib.collections]);

  const upsert = useCallback((draft: BookmarkDraft) => {
    setLib((l) => {
      if (draft.id) {
        return { ...l, bookmarks: l.bookmarks.map((b) => (b.id === draft.id ? { ...b, ...draft, id: b.id } : b)) };
      }
      const b: Bookmark = { ...draft, id: uid(), createdAt: Date.now() };
      return { ...l, bookmarks: [b, ...l.bookmarks] };
    });
  }, []);

  const remove = useCallback((id: string) => {
    setLib((l) => ({ ...l, bookmarks: l.bookmarks.filter((b) => b.id !== id) }));
  }, []);

  const restore = useCallback((b: Bookmark) => {
    setLib((l) => ({ ...l, bookmarks: [b, ...l.bookmarks].sort((x, y) => y.createdAt - x.createdAt) }));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setLib((l) => ({ ...l, bookmarks: l.bookmarks.map((b) => (b.id === id ? { ...b, favorite: !b.favorite } : b)) }));
  }, []);

  const addCollection = useCallback((name: string): Collection => {
    const c = { id: uid(), name: name.trim() };
    setLib((l) => ({ ...l, collections: [...l.collections, c] }));
    return c;
  }, []);

  const renameCollection = useCallback((id: string, name: string) => {
    setLib((l) => ({ ...l, collections: l.collections.map((c) => (c.id === id ? { ...c, name } : c)) }));
  }, []);

  /** Deleting a collection keeps its bookmarks; they move to "All bookmarks" only. */
  const deleteCollection = useCallback((id: string) => {
    setLib((l) => ({
      collections: l.collections.filter((c) => c.id !== id),
      bookmarks: l.bookmarks.map((b) => (b.collectionId === id ? { ...b, collectionId: null } : b)),
    }));
  }, []);

  /** Merges imported data, skipping URLs that are already saved. */
  const merge = useCallback(
    (incoming: Library): number => {
      const seen = new Set(lib.bookmarks.map((b) => b.url));
      const fresh = incoming.bookmarks.filter((b) => !seen.has(b.url) && seen.add(b.url));
      setLib((l) => {
        const known = new Set(l.collections.map((c) => c.id));
        return {
          collections: [...l.collections, ...incoming.collections.filter((c) => !known.has(c.id))],
          bookmarks: [...fresh, ...l.bookmarks].sort((x, y) => y.createdAt - x.createdAt),
        };
      });
      return fresh.length;
    },
    [lib.bookmarks],
  );

  return { ...lib, upsert, remove, restore, toggleFavorite, addCollection, renameCollection, deleteCollection, merge };
}
