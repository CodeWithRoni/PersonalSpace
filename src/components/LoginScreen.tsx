import { useState } from "react";
import { motion } from "motion/react";
import logo from "../assets/logo.svg";
import { Loader2 } from "lucide-react";
import { DEFAULT_URL, login, type Session } from "../lib/sync";
import { load, save } from "../lib/storage";

export function LoginScreen({ onLogin }: { onLogin: (s: Session) => Promise<void> }) {
  const [url, setUrl] = useState(() => DEFAULT_URL || load("lastUrl", ""));
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const s = await login(url, password);
      save("lastUrl", s.url);
      await onLogin(s);
    } catch (err) {
      setError(err instanceof TypeError ? "Can't reach Google. Check your internet connection." : (err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <motion.form
        className="login-card"
        onSubmit={submit}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <img className="brand-mark big" src={logo} alt="" />
        <h1>PersonalSpace</h1>
        <p className="login-sub">Sign in to load your bookmarks from Google Sheets.</p>

        {!DEFAULT_URL && (
          <label className="field">
            <span>Apps Script Web app URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/…/exec"
              autoComplete="url"
              spellCheck={false}
              autoFocus={!url}
              required
            />
          </label>
        )}

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus={!!url}
            required
          />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="btn btn-primary login-btn" disabled={busy}>
          {busy ? <><Loader2 size={16} className="spin" /> Signing in</> : "Sign in"}
        </button>
      </motion.form>
    </div>
  );
}
