import { useState } from "react";
import { motion } from "motion/react";
import { Bookmark as BookmarkIcon, Download, FolderClosed, FolderOpen, Library, Pencil, Plus, Star, Trash2, Upload } from "lucide-react";
import type { Collection, Filter } from "../types";

interface Props {
  filter: Filter;
  setFilter: (f: Filter) => void;
  collections: Collection[];
  counts: { all: number; favorites: number; byCollection: Map<string, number> };
  onAddCollection: (name: string) => void;
  onRenameCollection: (id: string, name: string) => void;
  onDeleteCollection: (c: Collection) => void;
  onImport: () => void;
  onExport: () => void;
}

const same = (a: Filter, b: Filter) => JSON.stringify(a) === JSON.stringify(b);

function NavItem({
  active,
  icon,
  label,
  count,
  onClick,
  children,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={`nav-item ${active ? "active" : ""}`}>
      {active && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
      <button className="nav-btn" onClick={onClick} aria-current={active ? "page" : undefined}>
        {icon}
        <span className="nav-label">{label}</span>
        {count !== undefined && <span className="nav-count">{count}</span>}
      </button>
      {children}
    </div>
  );
}

export function Sidebar(p: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const submitNew = () => {
    if (name.trim()) p.onAddCollection(name);
    setName("");
    setAdding(false);
  };

  return (
    <nav className="sidebar" aria-label="Library">
      <div className="brand">
        <span className="brand-mark"><BookmarkIcon size={16} strokeWidth={2.4} /></span>
        PersonalSpace
      </div>

      <div className="nav-group">
        <NavItem active={same(p.filter, { kind: "all" })} icon={<Library size={17} />} label="All bookmarks" count={p.counts.all} onClick={() => p.setFilter({ kind: "all" })} />
        <NavItem active={same(p.filter, { kind: "favorites" })} icon={<Star size={17} />} label="Favorites" count={p.counts.favorites} onClick={() => p.setFilter({ kind: "favorites" })} />
      </div>

      <div className="nav-group">
        <div className="nav-heading">
          <span>Folders</span>
          <button className="icon-btn small" onClick={() => setAdding(true)} aria-label="New folder">
            <Plus size={15} />
          </button>
        </div>
        {p.collections.map((c) =>
          editing === c.id ? (
            <input
              key={c.id}
              className="nav-input"
              defaultValue={c.name}
              autoFocus
              onBlur={(e) => { if (e.target.value.trim()) p.onRenameCollection(c.id, e.target.value.trim()); setEditing(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditing(null); }}
            />
          ) : (
            <NavItem
              key={c.id}
              active={same(p.filter, { kind: "collection", id: c.id })}
              icon={same(p.filter, { kind: "collection", id: c.id }) ? <FolderOpen size={17} /> : <FolderClosed size={17} />}
              label={c.name}
              count={p.counts.byCollection.get(c.id) ?? 0}
              onClick={() => p.setFilter({ kind: "collection", id: c.id })}
            >
              <span className="nav-tools">
                <button className="icon-btn small" onClick={() => setEditing(c.id)} aria-label={`Rename ${c.name}`}><Pencil size={13} /></button>
                <button className="icon-btn small danger" onClick={() => p.onDeleteCollection(c)} aria-label={`Delete ${c.name}`}>
                  <Trash2 size={13} />
                </button>
              </span>
            </NavItem>
          ),
        )}
        {adding && (
          <input
            className="nav-input"
            autoFocus
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={submitNew}
            onKeyDown={(e) => { if (e.key === "Enter") submitNew(); if (e.key === "Escape") { setName(""); setAdding(false); } }}
          />
        )}
        {p.collections.length === 0 && !adding && <p className="nav-empty">Make a folder to group links by project or topic.</p>}
      </div>

      <div className="sidebar-foot">
        <button className="foot-btn" onClick={p.onImport}><Upload size={15} /> Import</button>
        <button className="foot-btn" onClick={p.onExport}><Download size={15} /> Export</button>
      </div>
    </nav>
  );
}
