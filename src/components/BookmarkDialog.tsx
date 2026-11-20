import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Link2, X } from "lucide-react";
import type { BookmarkDraft, Collection } from "../types";
import { domainOf, normalizeUrl, titleFromUrl } from "../lib/url";
import { Favicon } from "./BookmarkCard";

interface Props {
  initial: BookmarkDraft;
  collections: Collection[];
  isDuplicate: (url: string, id?: string) => boolean;
  onSave: (d: BookmarkDraft) => void;
  onCreateCollection: (name: string) => Collection;
  onClose: () => void;
}

export function BookmarkDialog({ initial, collections, isDuplicate, onSave, onCreateCollection, onClose }: Props) {
  const [url, setUrl] = useState(initial.url);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [collectionId, setCollectionId] = useState<string>(initial.collectionId ?? "");
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [favorite, setFavorite] = useState(initial.favorite);
  const [newCollection, setNewCollection] = useState("");
  const [error, setError] = useState("");
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const normalized = normalizeUrl(url);
  const domain = normalized ? domainOf(normalized) : "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalized) return setError("Enter a web address, like github.com or https://example.com");
    if (isDuplicate(normalized, initial.id)) return setError("This link is already saved.");
    let cid = collectionId || null;
    if (collectionId === "__new") {
      cid = newCollection.trim() ? onCreateCollection(newCollection).id : null;
    }
    onSave({
      id: initial.id,
      url: normalized,
      title: title.trim() || titleFromUrl(normalized),
      description: description.trim(),
      collectionId: cid,
      tags: [...new Set(tags.split(",").map((t) => t.trim().toLowerCase().replace(/^#/, "")).filter(Boolean))],
      favorite,
    });
  };

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onSubmit={submit}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.14 } }}
        transition={{ type: "spring", stiffness: 500, damping: 36 }}
      >
        <header className="dialog-head">
          <h2 id="dialog-title">{initial.id ? "Edit bookmark" : "Save a link"}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <label className="field">
          <span>Link</span>
          <div className="url-input">
            <span className="url-icon">{domain ? <Favicon key={domain} domain={domain} size={18} /> : <Link2 size={16} />}</span>
            <input
              ref={firstField}
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(""); }}
              placeholder="https://"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </label>

        <label className="field">
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={normalized ? titleFromUrl(normalized) : "Leave empty to use the address"}
          />
        </label>

        <label className="field">
          <span>Note</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Why you saved it (optional)"
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Collection</span>
            <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
              <option value="">None</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="__new">New collection…</option>
            </select>
          </label>
          <label className="field">
            <span>Tags</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="design, read-later" />
          </label>
        </div>

        {collectionId === "__new" && (
          <label className="field">
            <span>New collection name</span>
            <input value={newCollection} onChange={(e) => setNewCollection(e.target.value)} autoFocus />
          </label>
        )}

        <label className="check">
          <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} />
          Add to favorites
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <footer className="dialog-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{initial.id ? "Save changes" : "Save link"}</button>
        </footer>
      </motion.form>
    </motion.div>
  );
}
