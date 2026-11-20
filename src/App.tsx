import { useEffect, useState } from "react";
import { getAppInfo, type AppInfo } from "./lib/platform";
import { load, save } from "./lib/storage";
import "./App.css";

type Section = "notes" | "tasks";

interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

interface Task {
  id: string;
  text: string;
  done: boolean;
}

const uid = () => Math.random().toString(36).slice(2, 10);

function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => load(key, initial));
  useEffect(() => save(key, value), [key, value]);
  return [value, setValue] as const;
}

function Notes() {
  const [notes, setNotes] = usePersisted<Note[]>("notes", []);
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null);
  const active = notes.find((n) => n.id === activeId) ?? null;

  const addNote = () => {
    const note: Note = { id: uid(), title: "Untitled", body: "", updatedAt: Date.now() };
    setNotes([note, ...notes]);
    setActiveId(note.id);
  };

  const update = (patch: Partial<Note>) =>
    setNotes(notes.map((n) => (n.id === activeId ? { ...n, ...patch, updatedAt: Date.now() } : n)));

  const remove = (id: string) => {
    const rest = notes.filter((n) => n.id !== id);
    setNotes(rest);
    if (id === activeId) setActiveId(rest[0]?.id ?? null);
  };

  return (
    <div className="notes">
      <div className="notes-list">
        <button className="primary" onClick={addNote}>+ New note</button>
        {notes.map((n) => (
          <div
            key={n.id}
            className={`note-item ${n.id === activeId ? "active" : ""}`}
            onClick={() => setActiveId(n.id)}
          >
            <span>{n.title || "Untitled"}</span>
            <button className="ghost" onClick={(e) => { e.stopPropagation(); remove(n.id); }}>×</button>
          </div>
        ))}
        {notes.length === 0 && <p className="muted">No notes yet.</p>}
      </div>
      <div className="editor">
        {active ? (
          <>
            <input
              className="title-input"
              value={active.title}
              onChange={(e) => update({ title: e.target.value })}
            />
            <textarea
              value={active.body}
              placeholder="Write anything…"
              onChange={(e) => update({ body: e.target.value })}
            />
          </>
        ) : (
          <p className="muted">Select or create a note.</p>
        )}
      </div>
    </div>
  );
}

function Tasks() {
  const [tasks, setTasks] = usePersisted<Task[]>("tasks", []);
  const [text, setText] = useState("");

  const add = () => {
    if (!text.trim()) return;
    setTasks([...tasks, { id: uid(), text: text.trim(), done: false }]);
    setText("");
  };

  return (
    <div className="tasks">
      <form className="task-form" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task…" />
        <button className="primary" type="submit">Add</button>
      </form>
      <ul>
        {tasks.map((t) => (
          <li key={t.id} className={t.done ? "done" : ""}>
            <label>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => setTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
              />
              {t.text}
            </label>
            <button className="ghost" onClick={() => setTasks(tasks.filter((x) => x.id !== t.id))}>×</button>
          </li>
        ))}
      </ul>
      {tasks.length === 0 && <p className="muted">Nothing to do. Nice.</p>}
    </div>
  );
}

export default function App() {
  const [section, setSection] = useState<Section>("notes");
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    getAppInfo().then(setInfo).catch(() => setInfo(null));
  }, []);

  return (
    <div className="app">
      <nav className="sidebar">
        <h1>PersonalSpace</h1>
        <button className={section === "notes" ? "active" : ""} onClick={() => setSection("notes")}>📝 Notes</button>
        <button className={section === "tasks" ? "active" : ""} onClick={() => setSection("tasks")}>✅ Tasks</button>
        <div className="runtime">
          {info ? `${info.runtime} · ${info.os} · v${info.version}` : "…"}
        </div>
      </nav>
      <main className="content">{section === "notes" ? <Notes /> : <Tasks />}</main>
    </div>
  );
}
