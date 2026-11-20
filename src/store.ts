import { useCallback, useEffect, useRef, useState } from "react";
import type { Bookmark, BookmarkDraft, Collection } from "./types";
import { load, save } from "./lib/storage";
import { uid, type Library } from "./lib/importExport";
import { enqueue, type Op } from "./lib/sync";

/**
 * Library state. Every change updates the screen immediately, is cached on the
 * device, and is queued for the Google Sheet (see lib/sync.ts).
 */
export function useLibrary() {
  const [lib, setLib] = useState<Library>(() => ({
    bookmarks: load<Bookmark[]>("bookmarks", []),
    collections: load<Collection[]>("collections", []),
  }));
  const ref = useRef(lib);

  useEffect(() => save("bookmarks", lib.bookmarks), [lib.bookmarks]);
  useEffect(() => save("collections", lib.collections), [lib.collections]);

  const commit = useCallback((next: Library, ops: Op[] = []) => {
    ref.current = next;
    setLib(next);
    enqueue(ops);
  }, []);

  /** Replaces everything with what the Sheet has (no ops sent). */
  const replaceAll = useCallback((next: Library) => commit(next), [commit]);

  const upsert = useCallback(
    (draft: BookmarkDraft) => {
      const l = ref.current;
      if (draft.id) {
        const old = l.bookmarks.find((b) => b.id === draft.id);
        if (!old) return;
        const b: Bookmark = { ...old, ...draft, id: old.id };
        commit({ ...l, bookmarks: l.bookmarks.map((x) => (x.id === b.id ? b : x)) }, [{ type: "upsertBookmark", bookmark: b }]);
      } else {
        const b: Bookmark = { ...draft, id: uid(), createdAt: Date.now() };
        commit({ ...l, bookmarks: [b, ...l.bookmarks] }, [{ type: "upsertBookmark", bookmark: b }]);
      }
    },
    [commit],
  );

  const remove = useCallback(
    (id: string) => {
      const l = ref.current;
      commit({ ...l, bookmarks: l.bookmarks.filter((b) => b.id !== id) }, [{ type: "deleteBookmark", id }]);
    },
    [commit],
  );

  const restore = useCallback(
    (b: Bookmark) => {
      const l = ref.current;
      const bookmarks = [b, ...l.bookmarks.filter((x) => x.id !== b.id)].sort((x, y) => y.createdAt - x.createdAt);
      commit({ ...l, bookmarks }, [{ type: "upsertBookmark", bookmark: b }]);
    },
    [commit],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      const l = ref.current;
      const old = l.bookmarks.find((b) => b.id === id);
      if (!old) return;
      const b = { ...old, favorite: !old.favorite };
      commit({ ...l, bookmarks: l.bookmarks.map((x) => (x.id === id ? b : x)) }, [{ type: "upsertBookmark", bookmark: b }]);
    },
    [commit],
  );

  const addCollection = useCallback(
    (name: string): Collection => {
      const l = ref.current;
      const c = { id: uid(), name: name.trim() };
      commit({ ...l, collections: [...l.collections, c] }, [{ type: "upsertFolder", folder: c }]);
      return c;
    },
    [commit],
  );

  const renameCollection = useCallback(
    (id: string, name: string) => {
      const l = ref.current;
      const c = { id, name };
      commit({ ...l, collections: l.collections.map((x) => (x.id === id ? c : x)) }, [{ type: "upsertFolder", folder: c }]);
    },
    [commit],
  );

  /** Deleting a folder keeps its bookmarks; they stay in "All bookmarks". */
  const deleteCollection = useCallback(
    (id: string) => {
      const l = ref.current;
      commit(
        {
          collections: l.collections.filter((c) => c.id !== id),
          bookmarks: l.bookmarks.map((b) => (b.collectionId === id ? { ...b, collectionId: null } : b)),
        },
        [{ type: "deleteFolder", id }],
      );
    },
    [commit],
  );

  /** Merges imported data, skipping URLs that are already saved. Returns how many were added. */
  const merge = useCallback(
    (incoming: Library): number => {
      const l = ref.current;
      const seen = new Set(l.bookmarks.map((b) => b.url));
      const fresh = incoming.bookmarks.filter((b) => !seen.has(b.url) && seen.add(b.url));
      const known = new Set(l.collections.map((c) => c.id));
      const newFolders = incoming.collections.filter((c) => !known.has(c.id));
      commit(
        {
          collections: [...l.collections, ...newFolders],
          bookmarks: [...fresh, ...l.bookmarks].sort((x, y) => y.createdAt - x.createdAt),
        },
        [
          ...newFolders.map((folder): Op => ({ type: "upsertFolder", folder })),
          ...fresh.map((bookmark): Op => ({ type: "upsertBookmark", bookmark })),
        ],
      );
      return fresh.length;
    },
    [commit],
  );

  /** Sends everything on this device to the Sheet (used when the Sheet is still empty). */
  const uploadAll = useCallback((): number => {
    const l = ref.current;
    enqueue([
      ...l.collections.map((folder): Op => ({ type: "upsertFolder", folder })),
      ...l.bookmarks.map((bookmark): Op => ({ type: "upsertBookmark", bookmark })),
    ]);
    return l.bookmarks.length + l.collections.length;
  }, []);

  return { ...lib, replaceAll, uploadAll, upsert, remove, restore, toggleFavorite, addCollection, renameCollection, deleteCollection, merge };
}
