// Talks to the Google Apps Script backend (apps-script/Code.gs) that stores
// everything in your Google Sheet. Changes are queued locally first, so the app
// stays fast and keeps working offline; the queue is sent in batches.

import type { Bookmark, Collection } from "../types";
import { load, save } from "./storage";

export type Op =
  | { type: "upsertBookmark"; bookmark: Bookmark }
  | { type: "deleteBookmark"; id: string }
  | { type: "upsertFolder"; folder: Collection }
  | { type: "deleteFolder"; id: string };

export interface Session {
  url: string;
  token: string;
}

export type SyncState =
  | { status: "idle" }
  | { status: "saving"; pending: number }
  | { status: "offline"; pending: number }
  | { status: "error"; pending: number; message: string };

export class AuthError extends Error {}

/** Set VITE_APPS_SCRIPT_URL at build time to skip typing the URL on the login screen. */
export const DEFAULT_URL: string = import.meta.env.VITE_APPS_SCRIPT_URL ?? "";

export const getSession = () => load<Session | null>("session", null);
const setSession = (s: Session | null) => save("session", s);

async function call<T>(url: string, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    // text/plain keeps this a "simple" request, so Apps Script needs no CORS preflight.
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow",
    });
  } catch {
    throw new TypeError("offline");
  }
  if (!res.ok) throw new Error(`Google returned ${res.status}`);
  let data: { ok: boolean; error?: string; message?: string } & T;
  try {
    data = await res.json();
  } catch {
    throw new Error("The Apps Script URL didn't return PersonalSpace data. Check the Web app URL and that access is set to Anyone.");
  }
  if (!data.ok) {
    if (data.error === "unauthorized") throw new AuthError("Session expired. Sign in again.");
    throw new Error(ERRORS[data.error ?? ""] ?? data.message ?? data.error ?? "Unknown error");
  }
  return data;
}

const ERRORS: Record<string, string> = {
  wrong_password: "Wrong password.",
  locked: "Too many wrong attempts. Try again in 10 minutes.",
  not_configured: "APP_PASSWORD isn't set in the Apps Script project's Script properties.",
};

export async function login(url: string, password: string): Promise<Session> {
  const clean = url.trim();
  if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(clean)) {
    throw new Error("Paste the Web app URL from Apps Script (it starts with https://script.google.com/).");
  }
  const { token } = await call<{ token: string }>(clean, { action: "login", password });
  const s = { url: clean, token };
  setSession(s);
  return s;
}

export async function logout() {
  const s = getSession();
  setSession(null);
  save("queue", []);
  if (s) call(s.url, { action: "logout", token: s.token }).catch(() => {});
}

export async function pull(s: Session) {
  return call<{ bookmarks: Bookmark[]; collections: Collection[] }>(s.url, { action: "pull", token: s.token });
}

/* ---------------- Outgoing queue ---------------- */

let queue: Op[] = load<Op[]>("queue", []);
let flushing = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let retryDelay = 2000;
const listeners = new Set<(s: SyncState) => void>();
let state: SyncState = queue.length ? { status: "saving", pending: queue.length } : { status: "idle" };
let onAuthError: () => void = () => {};

function emit(s: SyncState) {
  state = s;
  listeners.forEach((l) => l(s));
}

export function subscribe(fn: (s: SyncState) => void) {
  listeners.add(fn);
  fn(state);
  return () => void listeners.delete(fn);
}

export const pendingCount = () => queue.length;
export const setAuthErrorHandler = (fn: () => void) => (onAuthError = fn);

export function enqueue(ops: Op[]) {
  if (!ops.length || !getSession()) return;
  queue.push(...ops);
  save("queue", queue);
  emit({ status: "saving", pending: queue.length });
  schedule(500);
}

function schedule(ms: number) {
  clearTimeout(timer);
  timer = setTimeout(flush, ms);
}

export async function flush() {
  const s = getSession();
  if (!s || flushing || !queue.length) return;
  flushing = true;
  const batch = queue.slice(0, 200);
  try {
    emit({ status: "saving", pending: queue.length });
    await call(s.url, { action: "ops", token: s.token, ops: batch });
    queue = queue.slice(batch.length);
    save("queue", queue);
    retryDelay = 2000;
    emit(queue.length ? { status: "saving", pending: queue.length } : { status: "idle" });
    if (queue.length) schedule(0);
  } catch (e) {
    if (e instanceof AuthError) {
      onAuthError();
    } else {
      const offline = e instanceof TypeError || !navigator.onLine;
      emit(
        offline
          ? { status: "offline", pending: queue.length }
          : { status: "error", pending: queue.length, message: (e as Error).message },
      );
      schedule(retryDelay);
      retryDelay = Math.min(retryDelay * 2, 60000);
    }
  } finally {
    flushing = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { retryDelay = 2000; schedule(0); });
  if (queue.length) schedule(1000);
}
