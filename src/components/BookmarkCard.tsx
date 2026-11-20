import { memo, useState } from "react";
import { motion } from "motion/react";
import { FolderClosed, Pencil, Star, Trash2 } from "lucide-react";
import type { Bookmark } from "../types";
import { domainOf, faviconUrl, hueFor } from "../lib/url";

interface Props {
  bookmark: Bookmark;
  collectionName?: string;
  view: "grid" | "list";
  onOpen: (b: Bookmark) => void;
  onEdit: (b: Bookmark) => void;
  onDelete: (b: Bookmark) => void;
  onFavorite: (id: string) => void;
  onTag: (tag: string) => void;
}

export function Favicon({ domain, size = 20 }: { domain: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="favicon-fallback">{domain.charAt(0).toUpperCase()}</span>;
  return <img src={faviconUrl(domain)} width={size} height={size} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

export const BookmarkCard = memo(function BookmarkCard({
  bookmark: b,
  collectionName,
  view,
  onOpen,
  onEdit,
  onDelete,
  onFavorite,
  onTag,
}: Props) {
  const domain = domainOf(b.url);
  const hue = hueFor(domain);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
      className={`card card-${view}`}
      style={{ "--hue": hue } as React.CSSProperties}
    >
      <button className="card-main" onClick={() => onOpen(b)} title={b.url}>
        <span className="card-icon">
          <Favicon domain={domain} />
        </span>
        <span className="card-text">
          <span className="card-title">{b.title}</span>
          <span className="card-domain">
            <span className="card-domain-host">{domain}</span>
            {collectionName && (
              <span className="card-collection"><FolderClosed size={12} />{collectionName}</span>
            )}
          </span>
          {b.description && view === "grid" && <span className="card-desc">{b.description}</span>}
        </span>
      </button>

      {b.tags.length > 0 && (
        <div className="card-tags">
          {b.tags.map((t) => (
            <button key={t} className="chip" onClick={() => onTag(t)}>
              #{t}
            </button>
          ))}
        </div>
      )}

      <div className="card-actions">
        <button
          className={`icon-btn ${b.favorite ? "is-fav" : ""}`}
          onClick={() => onFavorite(b.id)}
          aria-label={b.favorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={b.favorite}
        >
          <Star size={16} fill={b.favorite ? "currentColor" : "none"} />
        </button>
        <button className="icon-btn" onClick={() => onEdit(b)} aria-label="Edit bookmark">
          <Pencil size={16} />
        </button>
        <button className="icon-btn danger" onClick={() => onDelete(b)} aria-label="Delete bookmark">
          <Trash2 size={16} />
        </button>
      </div>
    </motion.article>
  );
});
