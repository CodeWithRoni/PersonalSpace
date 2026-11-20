import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { LayoutGrid, List, Menu, Plus, Search, X } from "lucide-react";
import { useLibrary } from "./store";
import type { Bookmark, BookmarkDraft, Collection, Filter } from "./types";
import { Sidebar } from "./components/Sidebar";
import { BookmarkCard } from "./components/BookmarkCard";
import { BookmarkDialog } from "./components/BookmarkDialog";
import { domainOf, normalizeUrl } from "./lib/url";
import { openLink } from "./lib/open";
import { exportJson, importFile } from "./lib/importExport";
import { load, save } from "./lib/storage";
import "./styles.css";

interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

const emptyDraft = (over: Partial<BookmarkDraft> = {}): BookmarkDraft => ({
  url: "",
  title: "",
  description: "",
  collectionId: null,
  tags: [],
  favorite: false,
  ...over,
});

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

export default function App() {
  const lib = useLibrary();
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [view, setView] = useState<"grid" | "list">(() => load("view", "grid"));
  const [draft, setDraft] = useState<BookmarkDraft | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => save("view", view), [view]);

  const showToast = useCallback((text: string, action?: Toast["action"]) => {
    setToast({ id: Date.now(), text, action });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const collectionName = useMemo(() => new Map(lib.collections.map((c) => [c.id, c.name])), [lib.collections]);

  const counts = useMemo(() => {
    const byCollection = new Map<string, number>();
    let favorites = 0;
    for (const b of lib.bookmarks) {
      if (b.favorite) favorites++;
      if (b.collectionId) byCollection.set(b.collectionId, (byCollection.get(b.collectionId) ?? 0) + 1);
    }
    return { all: lib.bookmarks.length, favorites, byCollection };
  }, [lib.bookmarks]);

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return lib.bookmarks.filter((b) => {
      if (filter.kind === "favorites" && !b.favorite) return false;
      if (filter.kind === "collection" && b.collectionId !== filter.id) return false;
      if (filter.kind === "tag" && !b.tags.includes(filter.tag)) return false;
      if (!q) return true;
      return [b.title, b.url, b.description, ...b.tags].some((s) => s.toLowerCase().includes(q));
    });
  }, [lib.bookmarks, filter, deferredQuery]);

  const heading =
    filter.kind === "all"
      ? "All bookmarks"
      : filter.kind === "favorites"
        ? "Favorites"
        : filter.kind === "tag"
          ? `#${filter.tag}`
          : collectionName.get(filter.id) ?? "Folder";

  const newDraft = useCallback(
    (url = "") =>
      setDraft(
        emptyDraft({
          url,
          collectionId: filter.kind === "collection" ? filter.id : null,
          tags: filter.kind === "tag" ? [filter.tag] : [],
          favorite: filter.kind === "favorites",
        }),
      ),
    [filter],
  );

  // Keyboard: "/" search, "n" new link, paste a URL anywhere to save it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (draft || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === "n") { e.preventDefault(); newDraft(); }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (draft || isTyping(e.target)) return;
      const url = normalizeUrl(e.clipboardData?.getData("text") ?? "");
      if (url) { e.preventDefault(); newDraft(url); }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("paste", onPaste); };
  }, [draft, newDraft]);

  const isDuplicate = useCallback(
    (url: string, id?: string) => lib.bookmarks.some((b) => b.url === url && b.id !== id),
    [lib.bookmarks],
  );

  const handleSave = (d: BookmarkDraft) => {
    lib.upsert(d);
    setDraft(null);
    showToast(d.id ? "Changes saved" : `Saved ${domainOf(d.url)}`);
  };

  const handleDelete = useCallback(
    (b: Bookmark) => {
      lib.remove(b.id);
      showToast(`Deleted ${b.title}`, { label: "Undo", run: () => lib.restore(b) });
    },
    [lib, showToast],
  );

  const handleDeleteCollection = (c: Collection) => {
    lib.deleteCollection(c.id);
    if (filter.kind === "collection" && filter.id === c.id) setFilter({ kind: "all" });
    showToast(`Deleted folder ${c.name}. Its links are still in All bookmarks.`);
  };

  const handleImport = async (file: File) => {
    try {
      const added = lib.merge(await importFile(file, lib));
      showToast(added ? `Imported ${added} link${added === 1 ? "" : "s"}` : "No new links found in that file");
    } catch {
      showToast("That file couldn't be read. Use a PersonalSpace .json backup or a browser bookmarks .html export.");
    }
  };

  const selectFilter = (f: Filter) => { setFilter(f); setNavOpen(false); };

  const empty = lib.bookmarks.length === 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className={`app ${navOpen ? "nav-open" : ""}`}>
        <Sidebar
          filter={filter}
          setFilter={selectFilter}
          collections={lib.collections}
          counts={counts}
          onAddCollection={lib.addCollection}
          onRenameCollection={lib.renameCollection}
          onDeleteCollection={handleDeleteCollection}
          onImport={() => fileRef.current?.click()}
          onExport={() => exportJson({ bookmarks: lib.bookmarks, collections: lib.collections })}
        />
        <div className="scrim" onClick={() => setNavOpen(false)} />

        <main className="main">
          <header className="topbar">
            <button className="icon-btn menu-btn" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <div className="search">
              <Search size={17} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && (setQuery(""), e.currentTarget.blur())}
                placeholder="Search bookmarks"
                aria-label="Search bookmarks"
              />
              {query ? (
                <button className="icon-btn small" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>
              ) : (
                <kbd>/</kbd>
              )}
            </div>
            <div className="seg" role="group" aria-label="Layout">
              <button className={view === "grid" ? "on" : ""} onClick={() => setView("grid")} aria-label="Grid view" aria-pressed={view === "grid"}>
                <LayoutGrid size={16} />
              </button>
              <button className={view === "list" ? "on" : ""} onClick={() => setView("list")} aria-label="List view" aria-pressed={view === "list"}>
                <List size={16} />
              </button>
            </div>
            <button className="btn btn-primary add-btn" onClick={() => newDraft()}>
              <Plus size={17} /> <span>Add link</span>
            </button>
          </header>

          <section className="content">
            <div className="content-head">
              <h1>{heading}</h1>
              {!empty && (
                <span className="result-count">
                  {visible.length} {visible.length === 1 ? "link" : "links"}
                </span>
              )}
            </div>

            {empty ? (
              <div className="empty">
                <h2>Your links live here</h2>
                <p className="desktop-only">Paste a link anywhere on this screen, or press <kbd>N</kbd>, to save your first bookmark.</p>
                <p className="touch-only">Tap Add link to save your first bookmark.</p>
                <div className="empty-actions">
                  <button className="btn btn-primary" onClick={() => newDraft()}><Plus size={16} /> Add link</button>
                  <button className="btn" onClick={() => fileRef.current?.click()}>Import from browser</button>
                </div>
              </div>
            ) : visible.length === 0 ? (
              <div className="empty small">
                <p>{query ? `Nothing matches “${query}”.` : filter.kind === "collection" ? "This folder is empty. Add a link, or edit a link and choose this folder." : "No links here yet."}</p>
              </div>
            ) : (
              <motion.div layout className={`cards cards-${view}`}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {visible.map((b) => (
                    <BookmarkCard
                      key={b.id}
                      bookmark={b}
                      view={view}
                      collectionName={filter.kind !== "collection" && b.collectionId ? collectionName.get(b.collectionId) : undefined}
                      onOpen={(x) => openLink(x.url)}
                      onEdit={(x) => setDraft(x)}
                      onDelete={handleDelete}
                      onFavorite={lib.toggleFavorite}
                      onTag={(t) => selectFilter({ kind: "tag", tag: t })}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </section>
        </main>

        <AnimatePresence>
          {draft && (
            <BookmarkDialog
              key="dialog"
              initial={draft}
              collections={lib.collections}
              isDuplicate={isDuplicate}
              onSave={handleSave}
              onCreateCollection={lib.addCollection}
              onClose={() => setDraft(null)}
            />
          )}
        </AnimatePresence>

        <div className="toast-region" aria-live="polite">
          <AnimatePresence>
            {toast && (
              <motion.div
                key={toast.id}
                className="toast"
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
              >
                <span>{toast.text}</span>
                {toast.action && (
                  <button onClick={() => { toast.action!.run(); setToast(null); }}>{toast.action.label}</button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".html,.htm,.json"
          hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }}
        />
      </div>
    </MotionConfig>
  );
}
