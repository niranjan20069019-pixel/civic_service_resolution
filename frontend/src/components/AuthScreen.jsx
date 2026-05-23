import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api.js";
import { T } from "../theme.js";
import { SUPPORTED_LANGUAGES } from "../i18n.js";
import Particles, { IndiaSilhouette } from "./Particles.jsx";
import { Inp, Sel } from "./ui/Input.jsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PW_RULES = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One digit", test: (p) => /[0-9]/.test(p) },
];

const pwStrength = (p) => PW_RULES.filter((r) => r.test(p)).length;

const inputBase = {
  padding: "11px 14px", borderRadius: 10, border: `1px solid ${T.border}`,
  fontSize: 14, outline: "none", color: T.text, background: "rgba(255,255,255,0.05)",
  width: "100%", boxSizing: "border-box", transition: "border-color 0.2s",
};

export default function AuthScreen({ onLogin, lang, setLang, t }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "citizen" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Email validation state
  const [emailStatus, setEmailStatus] = useState(null); // null | "checking" | "valid" | "invalid" | "not_found" | "exists"
  const emailTimer = useRef(null);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); if (k === "email") setEmailStatus(null); };

  // Debounced email check
  useEffect(() => {
    const email = form.email.trim();
    if (!email) { setEmailStatus(null); return; }
    if (!EMAIL_RE.test(email)) { setEmailStatus("invalid"); return; }

    clearTimeout(emailTimer.current);
    setEmailStatus("checking");
    emailTimer.current = setTimeout(async () => {
      try {
        const res = await api.checkEmail(email);
        if (!res?.success) { setEmailStatus("valid"); return; }
        const { exists, valid } = res.data;
        if (!valid) { setEmailStatus("invalid"); return; }
        setEmailStatus(exists ? "exists" : "not_found");
      } catch {
        setEmailStatus("valid"); // backend unreachable — allow proceed
      }
    }, 500);
    return () => clearTimeout(emailTimer.current);
  }, [form.email]);

  const emailHint = () => {
    if (!form.email) return null;
    if (emailStatus === "checking") return { color: T.muted, text: "⏳ Checking…" };
    if (emailStatus === "invalid") return { color: "#fca5a5", text: "✗ Invalid email format" };
    if (emailStatus === "not_found" && mode === "login") return { color: "#fca5a5", text: "✗ No account found with this email" };
    if (emailStatus === "exists" && mode === "register") return { color: "#fca5a5", text: "✗ Email already registered — try logging in" };
    if (emailStatus === "not_found" && mode === "register") return { color: "#10b981", text: "✓ Email available" };
    if (emailStatus === "exists" && mode === "login") return { color: "#10b981", text: "✓ Account found" };
    return null;
  };

  const canSubmit = () => {
    if (emailStatus === "checking" || emailStatus === "invalid") return false;
    if (mode === "login" && emailStatus === "not_found") return false;
    if (mode === "register" && emailStatus === "exists") return false;
    if (mode === "register") {
      if (!form.name.trim() || form.name.trim().length < 2) return false;
      if (pwStrength(form.password) < 4) return false;
    }
    if (!form.password) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setLoading(true); setError("");
    try {
      const res = mode === "login"
        ? await api.login(form.email, form.password)
        : await api.register(form.name, form.email, form.password, form.role);
      if (res?.success) onLogin(res.data.user);
      else setError(res?.message || "Authentication failed.");
    } catch {
      setError("Cannot reach the backend. Check your connection.");
    }
    setLoading(false);
  };

  const hint = emailHint();
  const strength = pwStrength(form.password);
  const strengthColor = strength < 2 ? "#ef4444" : strength < 4 ? "#f59e0b" : "#10b981";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',system-ui,sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(6,182,212,0.08), transparent)", pointerEvents: "none" }} />
      <IndiaSilhouette />
      <Particles />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
        style={{ width: "min(440px,calc(100% - 32px))", background: "rgba(13,27,46,0.85)", backdropFilter: "blur(24px)", border: `1px solid ${T.border}`, borderRadius: 20, padding: "clamp(24px,5vw,40px) clamp(20px,5vw,40px) 36px", position: "relative", zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: T.gradBtn, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 26, boxShadow: "0 0 24px rgba(6,182,212,0.3)" }}>🏛️</div>
          <h1 style={{ color: T.text, fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{t("app_name")}</h1>
          <p style={{ color: T.muted, fontSize: 13 }}>{mode === "login" ? t("sign_in_account") : t("create_account")}</p>
        </div>

        {/* Language selector */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>🌐 {t("select_language")}</span>
          </div>
          <select value={lang} onChange={(e) => setLang(e.target.value)}
            style={{ ...inputBase, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: `1px solid rgba(6,182,212,0.3)` }}>
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {["login", "register"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setEmailStatus(null); }}
              style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${mode === m ? T.cyan : T.border}`, background: mode === m ? "rgba(6,182,212,0.12)" : "transparent", color: mode === m ? T.cyan : T.muted, fontSize: 13, cursor: "pointer", fontWeight: 600, transition: "all 0.15s" }}>
              {m === "login" ? t("sign_in") : t("register")}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, x: mode === "login" ? -15 : 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {mode === "register" && (
              <Inp label={`${t("username")} *`} icon="👤" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name (min 2 chars)" />
            )}

            {/* Email with live validation */}
            <div>
              <Inp label={`${t("email")} *`} icon="✉️" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
              {hint && <p style={{ color: hint.color, fontSize: 12, marginTop: 4 }}>{hint.text}</p>}
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: T.muted }}>{t("password")} *</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.muted, fontSize: 15 }}>🔒</span>
                <input type={showPw ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)}
                  placeholder={mode === "register" ? "Min 8 chars, upper+lower+digit" : "Your password"}
                  style={{ ...inputBase, paddingLeft: 38, paddingRight: 44 }}
                  onFocus={(e) => (e.target.style.borderColor = T.cyan)}
                  onBlur={(e) => (e.target.style.borderColor = T.border)} />
                <button onClick={() => setShowPw((s) => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 16, padding: 0 }}>
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>

              {/* Password strength bar + rules (register only) */}
              {mode === "register" && form.password && (
                <div>
                  <div style={{ height: 4, borderRadius: 2, background: T.border, overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ height: "100%", width: `${(strength / 4) * 100}%`, background: strengthColor, borderRadius: 2, transition: "width 0.3s, background 0.3s" }} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                    {PW_RULES.map((r) => (
                      <span key={r.label} style={{ fontSize: 11, color: r.test(form.password) ? "#10b981" : T.dim }}>
                        {r.test(form.password) ? "✓" : "○"} {r.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {mode === "register" && (
              <Sel label={t("role")} value={form.role} onChange={(e) => set("role", e.target.value)}>
                <option value="citizen">{t("citizen")}</option>
                <option value="official">{t("official")}</option>
                <option value="supervisor">{t("supervisor")}</option>
              </Sel>
            )}

            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                style={{ color: "#fca5a5", fontSize: 13, background: "rgba(239,68,68,0.08)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)" }}>
                ⚠ {error}
              </motion.div>
            )}

            <motion.button
              whileHover={canSubmit() && !loading ? { scale: 1.01, boxShadow: "0 0 40px rgba(6,182,212,0.5)" } : {}}
              whileTap={canSubmit() && !loading ? { scale: 0.99 } : {}}
              onClick={handleSubmit} disabled={loading || !canSubmit()}
              style={{ marginTop: 4, padding: "13px", borderRadius: 12, background: canSubmit() ? T.gradBtn : "rgba(255,255,255,0.06)", color: canSubmit() ? "#fff" : T.dim, fontWeight: 700, fontSize: 15, border: "none", cursor: canSubmit() && !loading ? "pointer" : "not-allowed", boxShadow: canSubmit() ? "0 0 24px rgba(6,182,212,0.3)" : "none", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                  Please wait…
                </span>
              ) : mode === "login" ? t("sign_in") : t("register")}
            </motion.button>
          </motion.div>
        </AnimatePresence>

        <p style={{ textAlign: "center", marginTop: 20, color: T.dim, fontSize: 13 }}>
          {mode === "login" ? "No account? " : "Already have an account? "}
          <button onClick={() => { setMode((m) => (m === "login" ? "register" : "login")); setError(""); setEmailStatus(null); }}
            style={{ color: T.cyan, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {mode === "login" ? t("register") : t("login")}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
