import { memo } from "react";
import { motion } from "motion/react";
import { FolderClosed, Pencil, Star, Trash2 } from "lucide-react";
import type { Bookmark } from "../types";
import { domainOf, hueFor } from "../lib/url";
import { rootDomain } from "../lib/url";

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

/**
 * PersonalSpace's own icon for every link: a gradient tile in the site's
 * colour with its initial. Same style everywhere, different colour per site,
 * no network requests.
 */
export function Favicon({ domain, size = 40 }: { domain: string; size?: number }) {
  const name = rootDomain(domain).split(".")[0] || domain;
  return (
    <span
      className="site-icon"
      style={{ "--hue": hueFor(domain), width: size, height: size, fontSize: size * 0.46, borderRadius: size * 0.28 } as React.CSSProperties}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
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
        <Favicon domain={domain} size={view === "list" ? 36 : 40} />
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
