import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api.js";
import { HeroGeometric } from "./components/ui/shape-landing-hero.tsx";
import { useTranslation } from "./useTranslation.js";
import { SUPPORTED_LANGUAGES } from "./i18n.js";
import { motion, AnimatePresence } from "framer-motion";
import Chatbot from "./Chatbot.jsx";
import IssueMap from "./IssueMap.jsx";
import IndiaMap from "./IndiaMap.jsx";
import ReportTracker from "./ReportTracker.jsx";
import ImageUpload from "./ImageUpload.jsx";
import LocationPicker from "./LocationPicker.jsx";
import { useSocket } from "./useSocket.js";
import { useResponsive } from "./useResponsive.js";

const CATEGORIES = ["roads", "sanitation", "water", "electricity", "parks", "safety", "other"];
const STATUSES = ["open", "in_progress", "resolved", "closed", "rejected"];
const PRIORITIES = ["low", "medium", "high", "critical"];

const STATUS_META = {
  open:        { label: "Open",        color: "#06b6d4", bg: "rgba(6,182,212,0.12)",   text: "#67e8f9" },
  in_progress: { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  text: "#fcd34d" },
  resolved:    { label: "Resolved",    color: "#10b981", bg: "rgba(16,185,129,0.12)",  text: "#6ee7b7" },
  closed:      { label: "Closed",      color: "#64748b", bg: "rgba(100,116,139,0.12)", text: "#94a3b8" },
  rejected:    { label: "Rejected",    color: "#ef4444", bg: "rgba(239,68,68,0.12)",   text: "#fca5a5" },
};
const PRIORITY_META = {
  low:      { label: "Low",      color: "#64748b", bg: "rgba(100,116,139,0.12)" },
  medium:   { label: "Medium",   color: "#06b6d4", bg: "rgba(6,182,212,0.12)"  },
  high:     { label: "High",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
};
const CAT_ICON = { roads:"🛣️", sanitation:"🗑️", water:"💧", electricity:"⚡", parks:"🌳", safety:"🚨", other:"📋" };
const ROLE_COLOR = { citizen: "#06b6d4", official: "#a855f7", supervisor: "#10b981" };

// TrustLens-matching dark theme tokens
const T = {
  bg:       "#0a0f1e",
  bg2:      "#0d1b2e",
  surface:  "rgba(255,255,255,0.04)",
  surface2: "rgba(255,255,255,0.07)",
  glass:    "rgba(13,27,46,0.8)",
  border:   "rgba(255,255,255,0.08)",
  border2:  "rgba(6,182,212,0.3)",
  text:     "#e2e8f0",
  muted:    "#94a3b8",
  dim:      "#475569",
  cyan:     "#06b6d4",
  purple:   "#a855f7",
  grad:     "linear-gradient(135deg, #06b6d4, #a855f7)",
  gradBtn:  "linear-gradient(90deg, #06b6d4 0%, #a855f7 100%)",
};

function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function fmt(iso) {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }) : "—";
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────

const Badge = ({ status, type = "status" }) => {
  const meta = type === "status" ? STATUS_META[status] : PRIORITY_META[status];
  if (!meta) return null;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, letterSpacing:"0.04em", background:meta.bg, color:meta.text||meta.color, border:`1px solid ${meta.color}44` }}>
      {type === "status" && <span style={{ width:6, height:6, borderRadius:"50%", background:meta.color, display:"inline-block" }} />}
      {meta.label}
    </span>
  );
};

const Card = ({ children, style={}, onClick }) => (
  <div onClick={onClick}
    style={{ background:T.surface, borderRadius:16, border:`1px solid ${T.border}`, padding:"20px 24px", cursor:onClick?"pointer":"default", transition:"all 0.2s", backdropFilter:"blur(12px)", ...style }}
    onMouseEnter={onClick ? e => { e.currentTarget.style.boxShadow=`0 4px 32px rgba(6,182,212,0.12)`; e.currentTarget.style.borderColor="rgba(6,182,212,0.25)"; e.currentTarget.style.transform="translateY(-2px)"; } : undefined}
    onMouseLeave={onClick ? e => { e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor=T.border; e.currentTarget.style.transform="none"; } : undefined}>
    {children}
  </div>
);

const MetricCard = ({ label, value, sub, color=T.cyan, icon }) => (
  <div style={{ background:T.surface, borderRadius:16, border:`1px solid ${T.border}`, padding:"20px 22px", backdropFilter:"blur(12px)", transition:"border-color 0.2s" }}
    onMouseEnter={e => e.currentTarget.style.borderColor="rgba(6,182,212,0.25)"}
    onMouseLeave={e => e.currentTarget.style.borderColor=T.border}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
      <span style={{ fontSize:11, color:T.muted, fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</span>
      {icon && <span style={{ fontSize:20, opacity:0.7 }}>{icon}</span>}
    </div>
    <div style={{ fontSize:34, fontWeight:700, color, lineHeight:1.1, marginBottom:4 }}>{value ?? "—"}</div>
    {sub && <div style={{ fontSize:12, color:T.dim }}>{sub}</div>}
  </div>
);

const inputBase = {
  padding:"11px 14px", borderRadius:10, border:`1px solid ${T.border}`,
  fontSize:14, outline:"none", color:T.text, background:"rgba(255,255,255,0.05)",
  width:"100%", boxSizing:"border-box", transition:"border-color 0.2s",
};

const Inp = ({ label, icon, ...props }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
    {label && <label style={{ fontSize:13, fontWeight:500, color:T.muted }}>{label}</label>}
    <div style={{ position:"relative" }}>
      {icon && <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:T.muted, fontSize:15 }}>{icon}</span>}
      <input style={{ ...inputBase, paddingLeft: icon ? 38 : 14 }}
        onFocus={e => (e.target.style.borderColor = T.cyan)}
        onBlur={e => (e.target.style.borderColor = T.border)}
        {...props} />
    </div>
  </div>
);

const Sel = ({ label, children, ...props }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
    {label && <label style={{ fontSize:13, fontWeight:500, color:T.muted }}>{label}</label>}
    <select style={{ ...inputBase, cursor:"pointer" }}
      onFocus={e => (e.target.style.borderColor = T.cyan)}
      onBlur={e => (e.target.style.borderColor = T.border)}
      {...props}>{children}</select>
  </div>
);

const Btn = ({ children, onClick, variant="primary", disabled, style={}, type="button" }) => {
  const variants = {
    primary:   { background:T.gradBtn, color:"#fff", border:"none", boxShadow:"0 0 20px rgba(6,182,212,0.25)" },
    secondary: { background:T.surface2, color:T.text, border:`1px solid ${T.border}` },
    danger:    { background:"rgba(239,68,68,0.1)", color:"#fca5a5", border:"1px solid rgba(239,68,68,0.3)" },
    ghost:     { background:"transparent", color:T.muted, border:`1px solid ${T.border}` },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      style={{ padding:"10px 22px", borderRadius:10, fontSize:14, fontWeight:600, cursor:disabled?"not-allowed":"pointer", transition:"all 0.2s", display:"inline-flex", alignItems:"center", gap:8, opacity:disabled?0.5:1, ...variants[variant], ...style }}
      onMouseEnter={!disabled ? e => (e.currentTarget.style.filter="brightness(1.15)") : undefined}
      onMouseLeave={!disabled ? e => (e.currentTarget.style.filter="none") : undefined}>
      {children}
    </button>
  );
};

const Spinner = () => (
  <div style={{ display:"flex", justifyContent:"center", padding:"48px 0" }}>
    <div style={{ width:32, height:32, border:`3px solid ${T.border}`, borderTop:`3px solid ${T.cyan}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
  </div>
);

const Toast = ({ msg, type="success" }) => {
  const c = type === "success"
    ? { bg:"rgba(16,185,129,0.12)", border:"rgba(16,185,129,0.3)", text:"#6ee7b7" }
    : { bg:"rgba(239,68,68,0.12)", border:"rgba(239,68,68,0.3)", text:"#fca5a5" };
  const { isMobile } = useResponsive();
  return (
    <div style={{ position:"fixed", top: isMobile ? 12 : 24, right: isMobile ? 12 : 24, left: isMobile ? 12 : "auto", background:c.bg, border:`1px solid ${c.border}`, backdropFilter:"blur(16px)", color:c.text, padding:"10px 16px", borderRadius:12, fontWeight:500, fontSize:13, zIndex:9999, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", animation:"slideIn 0.25s ease" }}>
      {type === "success" ? "✓" : "✗"} {msg}
    </div>
  );
};

const MiniBarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const colors = { open:"#06b6d4", in_progress:"#f59e0b", resolved:"#10b981", closed:"#64748b", rejected:"#ef4444", roads:"#06b6d4", sanitation:"#10b981", water:"#38bdf8", electricity:"#fbbf24", parks:"#4ade80", safety:"#ef4444", other:"#a855f7" };
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <span style={{ fontSize:10, color:T.text, fontWeight:600 }}>{d.value}</span>
          <div style={{ width:"100%", background:colors[d.key]||T.cyan, borderRadius:"3px 3px 0 0", height:`${Math.max((d.value/max)*60, d.value>0?8:0)}px`, transition:"height 0.4s ease", opacity:0.8 }} />
          <span style={{ fontSize:9, color:T.dim, textAlign:"center", lineHeight:1.2 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Auth Screen (Creative) ────────────────────────────────────────────────────
const PRESETS = [
  { label:"Citizen",    email:"jane@example.com", password:"Secure123!", role:"citizen" },
  { label:"Official",   email:"bob@city.gov",      password:"Secure123!", role:"official" },
  { label:"Supervisor", email:"alice@city.gov",    password:"Secure123!", role:"supervisor" },
];

function Particles() {
  const particles = useRef([]);
  if (particles.current.length === 0) {
    for (let i = 0; i < 25; i++) {
      particles.current.push({
        id: i, size: 1.5 + Math.random() * 3,
        x: Math.random() * 100, y: Math.random() * 100,
        driftX: (Math.random() - 0.5) * 30, driftY: -20 - Math.random() * 40,
        duration: 4 + Math.random() * 6, delay: Math.random() * 5,
        hue: i % 3 === 0 ? 182 : i % 3 === 1 ? 268 : 0,
      });
    }
  }
  return (
    <div style={{ position:"fixed", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
      {particles.current.map(p => (
        <motion.div
          key={p.id}
          style={{
            position:"absolute", width:p.size, height:p.size, borderRadius:"50%",
            background: `hsla(${p.hue},70%,60%,0.5)`,
            left:`${p.x}%`, top:`${p.y}%`,
            boxShadow: `0 0 ${p.size * 3}px hsla(${p.hue},70%,60%,0.3)`,
          }}
          animate={{ y: [0, p.driftY], x: [0, p.driftX], opacity: [0, 0.7, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function IndiaSilhouette() {
  return (
    <svg viewBox="0 0 400 400" style={{ position:"absolute", width:"70%", height:"70%", top:"15%", left:"15%", opacity:0.04, pointerEvents:"none" }}>
      <path d="M200 20 C240 30 280 40 300 70 C330 100 350 140 360 180 C370 220 365 260 350 290 C335 320 310 340 280 360 C250 380 220 390 200 395 C180 390 150 380 120 360 C90 340 65 320 50 290 C35 260 30 220 40 180 C50 140 70 100 100 70 C120 40 160 30 200 20Z"
        fill="none" stroke="url(#indiaGrad)" strokeWidth="0.5" opacity="0.6" />
      <defs>
        <linearGradient id="indiaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const AuthScreen = ({ onLogin, lang, setLang, t }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name:"", email:"bob@city.gov", password:"Secure123!", role:"official" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const res = mode === "login"
        ? await api.login(form.email, form.password)
        : await api.register(form.name, form.email, form.password, form.role);
      if (res?.success) onLogin(res.data.user);
      else setError(res?.message || "Authentication failed.");
    } catch {
      setError("Cannot reach server. Is the backend running on port 3000?");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',system-ui,sans-serif", position:"relative", overflow:"hidden" }}>
      {/* Background layers */}
      <div style={{ position:"fixed", inset:0, background:"radial-gradient(ellipse 80% 50% at 50% -20%, rgba(6,182,212,0.08), transparent)", pointerEvents:"none" }} />
      <div style={{ position:"fixed", inset:0, background:"radial-gradient(ellipse 50% 40% at 80% 60%, rgba(168,85,247,0.05), transparent)", pointerEvents:"none" }} />
      <IndiaSilhouette />
      <Particles />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
        style={{ width:"min(440px,calc(100% - 32px))", background:"rgba(13,27,46,0.85)", backdropFilter:"blur(24px)", border:`1px solid ${T.border}`, borderRadius:20, padding:"clamp(24px,5vw,40px) clamp(20px,5vw,40px) 36px", position:"relative", zIndex:1, overflow:"hidden" }}
      >
        {/* Animated gradient border */}
        <motion.div
          style={{ position:"absolute", inset:-1, borderRadius:21, background:"linear-gradient(135deg, transparent 40%, rgba(6,182,212,0.2), rgba(168,85,247,0.2), transparent 60%)", zIndex:-1, opacity:0.6 }}
          animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Logo + title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ textAlign:"center", marginBottom:28 }}
        >
          <div style={{ width:52, height:52, background:T.gradBtn, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", fontSize:26, boxShadow:"0 0 24px rgba(6,182,212,0.3)" }}>🏛️</div>
          <h1 style={{ color:T.text, fontSize:22, fontWeight:700, margin:"0 0 4px" }}>{t("app_name")}</h1>
          <p style={{ color:T.muted, fontSize:13 }}>{mode === "login" ? t("sign_in_account") : t("create_account")}</p>
        </motion.div>

        {/* Language selector - prominent */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{ marginBottom: 20 }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:16 }}>🌐</span>
            <span style={{ fontSize:13, fontWeight:600, color:T.muted, letterSpacing:"0.03em" }}>{t("select_language")}</span>
            <span style={{ marginLeft:"auto", fontSize:11, color:T.dim, background:"rgba(255,255,255,0.04)", padding:"2px 8px", borderRadius:4 }}>{SUPPORTED_LANGUAGES[lang]}</span>
          </div>
          <select value={lang} onChange={e => setLang(e.target.value)}
            style={{ ...inputBase, cursor: "pointer", background:"rgba(255,255,255,0.06)", border:`1px solid rgba(6,182,212,0.3)` }}
            onFocus={e => (e.target.style.borderColor = T.cyan)}
            onBlur={e => (e.target.style.borderColor = "rgba(6,182,212,0.3)")}>
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </motion.div>

        {/* Quick-fill presets */}
        <div style={{ display:"flex", gap:6, marginBottom:24 }}>
          {PRESETS.map(p => {
            const active = form.email === p.email;
            return (
              <motion.button key={p.role} onClick={() => setForm(f => ({ ...f, email:p.email, password:p.password, role:p.role }))}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ flex:1, padding:"7px 0", borderRadius:8, border:`1px solid ${active ? T.cyan : T.border}`, background:active ? "rgba(6,182,212,0.12)" : "transparent", color:active ? T.cyan : T.muted, fontSize:12, cursor:"pointer", fontWeight:500, transition:"all 0.15s" }}>
                {p.label}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === "login" ? -15 : 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === "login" ? 15 : -15 }}
            transition={{ duration: 0.25 }}
            style={{ display:"flex", flexDirection:"column", gap:16 }}
          >
            {mode === "register" && (
              <Inp label={t("username")} icon="👤" value={form.name} onChange={e => set("name", e.target.value)} placeholder="johndoe" />
            )}
            <Inp label={t("email")} icon="✉️" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" />

            {/* Password with show/hide */}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ fontSize:13, fontWeight:500, color:T.muted }}>{t("password")}</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:T.muted, fontSize:15 }}>🔒</span>
                <input type={showPw ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 6 characters"
                  style={{ ...inputBase, paddingLeft:38, paddingRight:44 }}
                  onFocus={e => (e.target.style.borderColor = T.cyan)}
                  onBlur={e => (e.target.style.borderColor = T.border)} />
                <button onClick={() => setShowPw(s => !s)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:T.muted, fontSize:16, padding:0 }}>
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <Sel label={t("role")} value={form.role} onChange={e => set("role", e.target.value)}>
                <option value="citizen">{t("citizen")}</option>
                <option value="official">{t("official")}</option>
                <option value="supervisor">{t("supervisor")}</option>
              </Sel>
            )}

            {/* Password strength bar (register only) */}
            {mode === "register" && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                style={{ height:4, borderRadius:2, background:T.border, overflow:"hidden" }}
              >
                <motion.div
                  style={{ height:"100%", background:form.password.length < 6 ? "#ef4444" : form.password.length < 10 ? "#f59e0b" : T.cyan, borderRadius:2 }}
                  animate={{ width: `${Math.min((form.password.length/12)*100, 100)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ color:"#fca5a5", fontSize:13, background:"rgba(239,68,68,0.08)", padding:"10px 14px", borderRadius:10, border:"1px solid rgba(239,68,68,0.2)" }}
              >⚠ {error}</motion.div>
            )}

            {/* Gradient CTA button */}
            <motion.button
              whileHover={!loading ? { scale: 1.01, boxShadow: "0 0 40px rgba(6,182,212,0.5)" } : {}}
              whileTap={!loading ? { scale: 0.99 } : {}}
              onClick={handleSubmit} disabled={loading}
              style={{ marginTop:4, padding:"13px", borderRadius:12, background:T.gradBtn, color:"#fff", fontWeight:700, fontSize:15, border:"none", cursor:loading?"not-allowed":"pointer", opacity:loading?0.8:1, boxShadow:"0 0 24px rgba(6,182,212,0.3)", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
            >
              {loading ? (
                <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,0.3)", borderTop:"2px solid #fff", borderRadius:"50%", animation:"spin 0.6s linear infinite" }} />
                  Please wait…
                </span>
              ) : mode === "login" ? t("sign_in") : t("register")}
            </motion.button>
          </motion.div>
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ textAlign:"center", marginTop:20, color:T.dim, fontSize:13 }}
        >
          {mode === "login" ? "No account? " : "Already have an account? "}
          <motion.button
            whileHover={{ color: T.cyan }}
            onClick={() => { setMode(m => m==="login"?"register":"login"); setError(""); }}
            style={{ color:T.cyan, background:"none", border:"none", cursor:"pointer", fontWeight:600, fontSize:13 }}
          >
            {mode === "login" ? t("register") : t("login")}
          </motion.button>
        </motion.p>

        <p style={{ textAlign:"center", marginTop:12, color:T.dim, fontSize:12 }}>
          <button onClick={() => document.getElementById("dashboard")?.scrollIntoView({ behavior:"smooth" })} style={{ color:T.dim, background:"none", border:"none", cursor:"pointer", fontSize:12 }}>
            ← Back to Home
          </button>
        </p>
      </motion.div>
    </div>
  );
};

// ─── Issue List ───────────────────────────────────────────────────────────────
function LanguageSelector({ lang, setLang, t, size="small" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const currentName = SUPPORTED_LANGUAGES[lang] || "English";
  const flagMap = { en:"🇬🇧", hi:"🇮🇳", ta:"🇮🇳", te:"🇮🇳", bn:"🇮🇳", mr:"🇮🇳", gu:"🇮🇳", kn:"🇮🇳", ml:"🇮🇳", pa:"🇮🇳" };
  return (
    <div ref={ref} style={{ position:"relative", display:"inline-block" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:6, padding: size==="small" ? "7px 12px" : "9px 16px", borderRadius:10, background:"rgba(255,255,255,0.06)", border:`1px solid ${open?"rgba(6,182,212,0.4)":T.border}`, color:T.text, fontSize: size==="small" ? 12 : 14, cursor:"pointer", transition:"all 0.15s", fontWeight:500 }}
        onMouseEnter={e => e.currentTarget.style.borderColor="rgba(6,182,212,0.3)"}
        onMouseLeave={e => e.currentTarget.style.borderColor=open?"rgba(6,182,212,0.4)":T.border}
      >
        <span style={{ fontSize:16 }}>{flagMap[lang] || "🌐"}</span>
        <span>{currentName}</span>
        <span style={{ fontSize:9, marginLeft:2, opacity:0.6 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, background:"rgba(13,27,46,0.98)", backdropFilter:"blur(16px)", border:`1px solid ${T.border}`, borderRadius:12, padding:"6px", zIndex:9999, minWidth:180, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", maxHeight:280, overflowY:"auto" }}>
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
            <button key={code} onClick={() => { setLang(code); setOpen(false); }}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"8px 12px", borderRadius:8, background:code===lang?"rgba(6,182,212,0.12)":"transparent", border:"none", color:code===lang?T.cyan:T.text, cursor:"pointer", fontSize:13, fontWeight:code===lang?600:400, transition:"all 0.1s", textAlign:"left" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background=code===lang?"rgba(6,182,212,0.12)":"transparent"}
            >
              <span style={{ fontSize:16, width:24, textAlign:"center" }}>{flagMap[code] || "🌐"}</span>
              <span>{name}</span>
              {code===lang && <span style={{ marginLeft:"auto", fontSize:14, color:T.cyan }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const IssueList = ({ user, onSelect, onCreate }) => {
  const { t, lang, setLang } = useTranslation();
  const { isMobile } = useResponsive();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status:"", category:"", priority:"", search:"", page:1 });
  const [pagination, setPagination] = useState({ total:0, pages:1 });
  const [showMap, setShowMap] = useState(false);
  const [showIndiaMap, setShowIndiaMap] = useState(false);
  const [liveFlash, setLiveFlash] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const res = await api.getIssues({ ...filters, limit:8 });
    if (res?.success) {
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : (payload.data ?? payload.issues ?? []);
      const total = payload.total ?? list.length;
      const pages = payload.pages ?? Math.ceil(total / 8);
      setIssues(list);
      setPagination({ total, pages });
    } else {
      setError(res?.message || "Failed to load issues.");
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  // Real-time socket updates
  useSocket({
    onIssueCreated: () => { setLiveFlash(true); setTimeout(() => setLiveFlash(false), 2000); load(); },
    onIssueUpdated: () => { load(); },
  });

  const setF = (k, v) => setFilters(f => ({ ...f, [k]:v, page:1 }));

  // Stat counts from loaded issues
  const openCount = issues.filter(i => i.status === "open").length;
  const inProgressCount = issues.filter(i => i.status === "in_progress").length;
  const resolvedCount = issues.filter(i => i.status === "resolved").length;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: isMobile ? 20 : 28, flexWrap:"wrap", gap:12 }}>
        <div style={{ textAlign: isMobile ? "center" : "left", flex:1 }}>
          <h2 style={{ fontSize: isMobile ? 22 : 26, fontWeight:700, color:T.text, margin:"0 0 4px" }}>
            {t("welcome_user")}, <span style={{ background:T.grad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{user.name}</span> 👋
          </h2>
          <p style={{ color:T.muted, fontSize:13, display:"flex", alignItems:"center", gap:8, justifyContent: isMobile ? "center" : "flex-start" }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:"#10b981", display:"inline-block", boxShadow:"0 0 6px #10b981" }} />
            {t("live_updated")}
          </p>
        </div>
        <LanguageSelector lang={lang} setLang={setLang} t={t} />
      </div>

      {/* Action buttons */}
      <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:8, marginBottom: isMobile ? 20 : 28 }}>
        <Btn variant="secondary" onClick={load}>↻ {t("refresh")}</Btn>
        <Btn variant={showMap?"primary":"ghost"} onClick={() => setShowMap(m => !m)}>🗺 {showMap ? "Hide Issues" : "Issue Map"}</Btn>
        <Btn variant={showIndiaMap?"primary":"ghost"} onClick={() => setShowIndiaMap(m => !m)}>🇮🇳 {showIndiaMap ? "Hide Heatmap" : "India Heatmap"}</Btn>
        {user.role === "citizen" && (
          <Btn onClick={onCreate} style={{ background:T.gradBtn, border:"none", boxShadow:"0 0 20px rgba(6,182,212,0.3)" }}>⊕ {t("new_issue")}</Btn>
        )}
        {liveFlash && <span style={{ padding:"8px 14px", borderRadius:10, background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.3)", color:"#6ee7b7", fontSize:12, fontWeight:600, animation:"slideIn 0.25s ease" }}>⚡ Live update</span>}
      </div>

      {/* Maps */}
      {showMap && (
        <div style={{ marginBottom:24 }}>
          <IssueMap issues={issues} onSelect={onSelect} />
        </div>
      )}
      {showIndiaMap && (
        <div style={{ marginBottom:24 }}>
          <IndiaMap issues={issues} lang={lang} />
        </div>
      )}

      {/* Stat cards row */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap:12, marginBottom:24 }}>
        <MetricCard label={t("total_issues")} value={pagination.total} icon="📋" color={T.text} />
        <MetricCard label={t("open")} value={openCount} icon="🔵" color={T.cyan} />
        <MetricCard label={t("in_progress")} value={inProgressCount} icon="🟡" color="#f59e0b" />
        <MetricCard label={t("resolved")} value={resolvedCount} icon="✅" color="#10b981" />
      </div>

      {/* Filters */}
      <Card style={{ marginBottom:20, padding: isMobile ? "12px 14px" : "16px 20px" }}>
        <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row", gap:10, alignItems: isMobile ? "stretch" : "end" }}>
          <Inp placeholder={t("search")} value={filters.search} onChange={e => setF("search", e.target.value)} />
          {[
            { key:"status",   opts:STATUSES,   meta:STATUS_META,   label:"All Statuses" },
            { key:"category", opts:CATEGORIES, meta:null,          label:"All Categories" },
            { key:"priority", opts:PRIORITIES, meta:PRIORITY_META, label:"All Priorities" },
          ].map(({ key, opts, meta, label }) => (
            <select key={key} value={filters[key]} onChange={e => setF(key, e.target.value)}
              style={{ ...inputBase, cursor:"pointer", width:"100%" }}
              onFocus={e => (e.target.style.borderColor = T.cyan)}
              onBlur={e => (e.target.style.borderColor = T.border)}>
              <option value="">{label}</option>
              {opts.map(o => <option key={o} value={o}>{key==="category"?`${CAT_ICON[o]} `:""}{meta?meta[o]?.label:o}</option>)}
            </select>
          ))}
        </div>
      </Card>

      {error && <div style={{ color:"#fca5a5", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:14 }}>⚠ {error}</div>}

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background:T.surface, borderRadius:16, border:`1px solid ${T.border}`, padding:"16px 20px", animation:"pulse 1.5s ease-in-out infinite" }}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <div style={{ width:36, height:36, borderRadius:8, background:"rgba(255,255,255,0.06)" }} />
                <div style={{ flex:1 }}>
                  <div style={{ height:14, width:"60%", borderRadius:6, background:"rgba(255,255,255,0.06)", marginBottom:8 }} />
                  <div style={{ height:11, width:"85%", borderRadius:6, background:"rgba(255,255,255,0.04)", marginBottom:6 }} />
                  <div style={{ height:11, width:"40%", borderRadius:6, background:"rgba(255,255,255,0.04)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:T.muted }}>
          <div style={{ fontSize:56, marginBottom:16 }}>📭</div>
          <p style={{ fontSize:17, fontWeight:600, color:T.text, marginBottom:8 }}>{t("no_issues_found")}</p>
          <p style={{ fontSize:13, color:T.dim, marginBottom:20 }}>No civic issues match your current filters.</p>
          {user.role === "citizen" && <Btn onClick={onCreate}>{t("report_first")}</Btn>}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {issues.map(issue => (
            <Card key={issue.id} onClick={() => onSelect(issue.id)} style={{ padding:"16px 20px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                    <span style={{ fontSize:18 }}>{CAT_ICON[issue.category]}</span>
                    <h3 style={{ fontSize:15, fontWeight:600, color:T.text, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth: isMobile ? 180 : 400 }}>{issue.title}</h3>
                  </div>
                  <p style={{ fontSize:13, color:T.muted, margin:"0 0 10px", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{issue.description}</p>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                    <Badge status={issue.status} type="status" />
                    <Badge status={issue.priority} type="priority" />
                    <span style={{ fontSize:12, color:T.dim }}>#{issue.id?.slice(0,8)}</span>
                    {issue.location?.address && <span style={{ fontSize:12, color:T.dim }}>📍 {issue.location.address}</span>}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:12, color:T.dim }}>{timeAgo(issue.updatedAt)}</div>
                  {issue.assignedTo && <div style={{ fontSize:11, color:T.cyan, marginTop:4 }}>● {t("assigned")}</div>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, marginTop:20, flexWrap:"wrap" }}>
          <Btn variant="ghost" disabled={filters.page<=1} onClick={() => setFilters(f => ({ ...f, page:f.page-1 }))}>{t("prev")}</Btn>
          <span style={{ padding:"6px 12px", fontSize:13, color:T.muted }}>{t("page_of")} {filters.page} {t("of")} {pagination.pages}</span>
          <Btn variant="ghost" disabled={filters.page>=pagination.pages} onClick={() => setFilters(f => ({ ...f, page:f.page+1 }))}>{t("next")}</Btn>
        </div>
      )}
    </div>
  );
};

// ─── Issue Detail ─────────────────────────────────────────────────────────────
const IssueDetail = ({ issueId, user, onBack, onUpdated }) => {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusForm, setStatusForm] = useState({ status:"", note:"" });
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getIssue(issueId);
    if (res?.success) { setData(res.data); setStatusForm(f => ({ ...f, status:res.data.issue?.status||"" })); }
    setLoading(false);
  }, [issueId]);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async () => {
    setUpdating(true);
    const res = await api.updateStatus(issueId, statusForm.status, statusForm.note);
    if (res?.success) { showToast("Status updated"); setShowForm(false); load(); onUpdated?.(); }
    else showToast(res?.message || "Update failed", "error");
    setUpdating(false);
  };

  if (loading) return <Spinner />;
  if (!data) return <div style={{ color:"#fca5a5", padding:24 }}>Issue not found.</div>;

  const { issue, history=[] } = data;
  const canUpdate = ["official","supervisor"].includes(user.role);

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <Btn variant="ghost" onClick={onBack}>← {t("back")}</Btn>
        <h2 style={{ fontSize:20, fontWeight:700, color:T.text, margin:0, flex:1 }}>{t("issue_detail")}</h2>
        {canUpdate && <Btn onClick={() => setShowForm(s => !s)} variant={showForm?"secondary":"primary"}>{showForm ? t("cancel") : t("update_status")}</Btn>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: isMobile ? 16 : 20, alignItems:"start" }}>
        <div style={{ display:"flex", flexDirection:"column", gap: isMobile ? 12 : 16 }}>
          <Card>
            <div style={{ display:"flex", gap:12, marginBottom:16 }}>
              <span style={{ fontSize:32 }}>{CAT_ICON[issue.category]}</span>
              <div>
                <h3 style={{ fontSize:18, fontWeight:700, color:T.text, margin:"0 0 8px" }}>{issue.title}</h3>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <Badge status={issue.status} type="status" />
                  <Badge status={issue.priority} type="priority" />
                  <span style={{ fontSize:12, color:T.dim, padding:"3px 10px", background:T.surface2, borderRadius:20 }}>{issue.category}</span>
                </div>
              </div>
            </div>
            <p style={{ color:T.muted, fontSize:14, lineHeight:1.7, margin:0 }}>{issue.description}</p>
          </Card>

          {showForm && (
            <Card style={{ border:`1.5px solid ${T.cyan}`, boxShadow:`0 0 20px rgba(6,182,212,0.1)` }}>
              <h4 style={{ fontSize:14, fontWeight:600, color:T.cyan, marginTop:0 }}>{t("update_status")}</h4>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <Sel label={t("new_status")} value={statusForm.status} onChange={e => setStatusForm(f => ({ ...f, status:e.target.value }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </Sel>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ fontSize:13, fontWeight:500, color:T.muted }}>{t("note")}</label>
                  <textarea rows={3} value={statusForm.note} onChange={e => setStatusForm(f => ({ ...f, note:e.target.value }))} placeholder={t("add_note")}
                    style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${T.border}`, fontSize:14, resize:"vertical", outline:"none", color:T.text, background:"rgba(255,255,255,0.05)", width:"100%", boxSizing:"border-box" }} />
                </div>
                <Btn onClick={handleStatusUpdate} disabled={updating}>{updating ? t("saving") : t("save_changes")}</Btn>
              </div>
            </Card>
          )}

          <Card>
            <h4 style={{ fontSize:14, fontWeight:600, color:T.muted, marginTop:0, marginBottom:16 }}>{t("audit_trail")}</h4>
            <div style={{ position:"relative" }}>
              <div style={{ position:"absolute", left:11, top:0, bottom:0, width:2, background:T.border }} />
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {history.map((h, i) => (
                  <div key={h.id||i} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                    <div style={{ width:24, height:24, borderRadius:"50%", background:i===0?"rgba(6,182,212,0.15)":"rgba(16,185,129,0.12)", border:`2px solid ${i===0?T.cyan:"#10b981"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:10, zIndex:1, color:i===0?T.cyan:"#10b981" }}>
                      {h.action==="created"?"+":"↑"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:T.text, fontWeight:500 }}>
                        {h.action==="created" ? t("issue_created") : `${t("status_to")} ${STATUS_META[h.to]?.label||h.to}`}
                      </div>
                      {h.note && <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{h.note}</div>}
                      <div style={{ fontSize:11, color:T.dim, marginTop:2 }}>{fmt(h.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Card>
            <h4 style={{ fontSize:12, fontWeight:600, color:T.dim, marginTop:0, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Details</h4>
            {[
              ["ID", `#${issue.id?.slice(0,8)}`],
              ["Category", `${CAT_ICON[issue.category]} ${issue.category}`],
              ["Reported", fmt(issue.createdAt)],
              ["Last Update", fmt(issue.updatedAt)],
              ["First Response", issue.firstResponseAt ? fmt(issue.firstResponseAt) : "Pending"],
              ["Resolved", issue.resolvedAt ? fmt(issue.resolvedAt) : "—"],
            ].map(([k, v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                <span style={{ color:T.dim }}>{k}</span>
                <span style={{ color:T.text, fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </Card>
          {issue.location && (
            <Card>
              <h4 style={{ fontSize:12, fontWeight:600, color:T.dim, marginTop:0, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Location</h4>
              {issue.location.address && <p style={{ fontSize:13, color:T.text, margin:"0 0 8px" }}>📍 {issue.location.address}</p>}
              <p style={{ fontSize:12, color:T.muted, margin:0 }}>Lat: {issue.location.lat?.toFixed(4)}, Lng: {issue.location.lng?.toFixed(4)}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Create Issue ─────────────────────────────────────────────────────────────
const CreateIssue = ({ onCreated, onCancel }) => {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();
  const [form, setForm] = useState({ title:"", description:"", category:"roads", priority:"medium", location:{ address:"", lat:"", lng:"" } });
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (form.title.length < 5) e.title = "Title must be at least 5 characters";
    if (form.description.length < 10) e.description = "Description must be at least 10 characters";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    const payload = { ...form, attachments, location: form.location.address ? { address:form.location.address, lat:parseFloat(form.location.lat)||0, lng:parseFloat(form.location.lng)||0 } : undefined };
    try {
      const res = await api.createIssue(payload);
      if (res?.success && res.data?.issue) {
        onCreated(res.data.issue);
      } else {
        setErrors({ submit: res?.message || "Failed to create issue." });
      }
    } catch (error) {
      setErrors({ submit: "Failed to create issue." });
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <Btn variant="ghost" onClick={onCancel}>← {t("cancel")}</Btn>
        <h2 style={{ fontSize:20, fontWeight:700, color:T.text, margin:0 }}>{t("report_issue")}</h2>
      </div>
      <div style={{ maxWidth: "100%" }}>
        <Card>
          <div style={{ display:"flex", flexDirection:"column", gap: isMobile ? 14 : 18 }}>
            <div>
              <Inp label={`${t("title")} *`} value={form.title} onChange={e => set("title", e.target.value)} placeholder={t("issue_title")} />
              {errors.title && <p style={{ color:"#fca5a5", fontSize:12, marginTop:4 }}>{errors.title}</p>}
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:500, color:T.muted, display:"block", marginBottom:6 }}>{t("description")} *</label>
              <textarea rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder={t("describe_issue")}
                style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${T.border}`, fontSize:14, resize:"vertical", outline:"none", color:T.text, background:"rgba(255,255,255,0.05)", boxSizing:"border-box" }} />
              {errors.description && <p style={{ color:"#fca5a5", fontSize:12, marginTop:4 }}>{errors.description}</p>}
            </div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <Sel label={t("category")} value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
              </Sel>
              <Sel label={t("priority")} value={form.priority} onChange={e => set("priority", e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </Sel>
            </div>
            <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:12, padding:16, border:`1px solid ${T.border}` }}>
              <h4 style={{ fontSize:13, fontWeight:600, color:T.muted, marginTop:0, marginBottom:12 }}>📍 {t("location")} (optional)</h4>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <Inp placeholder={t("address")} value={form.location.address} onChange={e => setForm(f => ({ ...f, location:{ ...f.location, address:e.target.value } }))} />
                <LocationPicker
                  value={form.location}
                  onChange={loc => setForm(f => ({ ...f, location:{ ...f.location, lat:loc.lat, lng:loc.lng } }))}
                />
              </div>
            </div>
            {errors.submit && <div style={{ color:"#fca5a5", fontSize:13, background:"rgba(239,68,68,0.08)", padding:"10px 14px", borderRadius:10, border:"1px solid rgba(239,68,68,0.2)" }}>⚠ {errors.submit}</div>}
            <div>
              <label style={{ fontSize:13, fontWeight:500, color:T.muted, display:"block", marginBottom:6 }}>📎 Photo (optional)</label>
              <ImageUpload onUploaded={url => setAttachments(a => [...a, url])} />
              {attachments.length > 0 && (
                <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                  {attachments.map((url, i) => (
                    <div key={i} style={{ position:"relative" }}>
                      <img src={url} alt="" style={{ width:64, height:64, objectFit:"cover", borderRadius:8, border:`1px solid ${T.border}` }} />
                      <button onClick={() => setAttachments(a => a.filter((_, j) => j !== i))}
                        style={{ position:"absolute", top:-6, right:-6, width:18, height:18, borderRadius:"50%", background:"#ef4444", border:"none", color:"#fff", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
              <Btn variant="secondary" onClick={onCancel}>{t("cancel")}</Btn>
              <Btn onClick={handleSubmit} disabled={loading}>{loading ? t("submitting") : t("submit")}</Btn>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Analytics ────────────────────────────────────────────────────────────────
const Analytics = ({ user }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");
  const { isMobile, isTablet } = useResponsive();

  const load = useCallback(() => {
    setLoading(true);
    api.getAnalytics().then(res => {
      if (res?.success) setData(res.data);
      else setError(res?.message || "Failed to load analytics.");
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    const res = await api.seedData();
    setSeeding(false);
    if (res?.success) { setSeedMsg(`✓ ${res.data.seeded} demo issues seeded`); load(); }
    else setSeedMsg("Seed failed — are you a supervisor?");
    setTimeout(() => setSeedMsg(""), 4000);
  };

  if (loading) return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 10 : 16, marginBottom:24 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height: isMobile ? 80 : 100, borderRadius:16, background:"rgba(255,255,255,0.04)", animation:"pulse 1.5s ease-in-out infinite" }} />)}
      </div>
      <div style={{ height:200, borderRadius:16, background:"rgba(255,255,255,0.04)", animation:"pulse 1.5s ease-in-out infinite" }} />
    </div>
  );
  if (error) return <div style={{ color:"#fca5a5", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"12px 16px", fontSize:14 }}>⚠ {error}</div>;
  if (!data) return null;

  const byStatus = data.by_status || [];
  const byCategory = data.by_category || [];
  const totalIssues = data.total_issues ?? byStatus.reduce((s, x) => s + x.total, 0);
  const resolvedCount = data.resolved_count ?? byStatus.find(s => s.status === "resolved")?.total ?? 0;
  const slaCompliance = totalIssues > 0 ? Math.round((resolvedCount / totalIssues) * 100) : 0;
  const avgResolutionH = byCategory.length > 0
    ? Math.round(byCategory.filter(c => c.avg_resolution_hours).reduce((s, c) => s + (c.avg_resolution_hours || 0), 0) / Math.max(byCategory.filter(c => c.avg_resolution_hours).length, 1))
    : null;

  const statusChart = byStatus.map(s => ({ key:s.status, label:STATUS_META[s.status]?.label?.slice(0,5)||s.status, value:s.total }));
  const catChart = byCategory.map(c => ({ key:c.category, label:c.category.slice(0,5), value:c.total }));

  // Heatmap intensity: 0–100 based on total relative to max
  const maxCat = Math.max(...byCategory.map(c => c.total), 1);
  const heatColor = (val) => {
    const pct = val / maxCat;
    if (pct > 0.75) return { bg:"rgba(239,68,68,0.25)", border:"rgba(239,68,68,0.5)", text:"#fca5a5" };
    if (pct > 0.4)  return { bg:"rgba(245,158,11,0.2)", border:"rgba(245,158,11,0.4)", text:"#fcd34d" };
    if (pct > 0.1)  return { bg:"rgba(6,182,212,0.15)", border:"rgba(6,182,212,0.3)", text:"#67e8f9" };
    return { bg:"rgba(255,255,255,0.04)", border:T.border, text:T.dim };
  };

  return (
    <div>
      <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row", justifyContent:"space-between", alignItems: isMobile ? "stretch" : "flex-start", gap:12, marginBottom:24 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? 20 : 22, fontWeight:700, color:T.text, margin:"0 0 4px" }}>Analytics & Transparency</h2>
          <p style={{ color:T.muted, fontSize:13, margin:0 }}>Live civic service performance data</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {seedMsg && <span style={{ fontSize:12, color:"#6ee7b7", padding:"6px 12px", background:"rgba(16,185,129,0.1)", borderRadius:8, border:"1px solid rgba(16,185,129,0.2)" }}>{seedMsg}</span>}
          {user?.role === "supervisor" && (
            <Btn variant="secondary" onClick={handleSeed} disabled={seeding} style={{ fontSize:12 }}>
              {seeding ? "Seeding…" : "🌱 Seed Demo Data"}
            </Btn>
          )}
          <Btn variant="ghost" onClick={load} style={{ fontSize:12 }}>↻ Refresh</Btn>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 10 : 16, marginBottom:24 }}>
        <MetricCard label="Total Issues" value={totalIssues} icon="📋" color={T.text} sub="all time" />
        <MetricCard label="SLA Compliance" value={`${slaCompliance}%`} icon="🎯" color={slaCompliance >= 70 ? "#10b981" : slaCompliance >= 40 ? "#f59e0b" : "#ef4444"} sub="resolved / total" />
        <MetricCard label="Open" value={byStatus.find(s=>s.status==="open")?.total??0} icon="🔵" color={T.cyan} sub="awaiting action" />
        <MetricCard label="Avg Resolution" value={avgResolutionH ? `${avgResolutionH}h` : "—"} icon="⏱" color="#a855f7" sub="across categories" />
      </div>

      {/* Charts row */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : 20, marginBottom:20 }}>
        <Card>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ color:T.cyan }}>📊</span>
            <h3 style={{ fontSize:14, fontWeight:700, color:T.text, margin:0, textTransform:"uppercase", letterSpacing:"0.05em" }}>Status Breakdown</h3>
          </div>
          <p style={{ fontSize:12, color:T.muted, marginBottom:16 }}>Distribution across all issue statuses</p>
          {statusChart.length > 0 && <MiniBarChart data={statusChart} />}
          <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:8 }}>
            {byStatus.filter(s=>s.total>0).map(s => (
              <div key={s.status} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <Badge status={s.status} type="status" />
                <div style={{ flex:1, margin:"0 12px", height:5, background:T.surface2, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${totalIssues?(s.total/totalIssues)*100:0}%`, background:STATUS_META[s.status]?.color||T.muted, borderRadius:3, transition:"width 0.6s ease" }} />
                </div>
                <span style={{ fontSize:13, fontWeight:600, color:T.text, minWidth:24, textAlign:"right" }}>{s.total}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ color:T.cyan }}>📈</span>
            <h3 style={{ fontSize:14, fontWeight:700, color:T.text, margin:0, textTransform:"uppercase", letterSpacing:"0.05em" }}>Issues by Category</h3>
          </div>
          <p style={{ fontSize:12, color:T.muted, marginBottom:16 }}>Volume per category with resolution rate</p>
          {catChart.length > 0 && <MiniBarChart data={catChart} />}
          <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:8 }}>
            {[...byCategory].sort((a,b)=>b.total-a.total).map(c => (
              <div key={c.category} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13 }}>
                <span style={{ color:T.text, display:"flex", alignItems:"center", gap:6 }}>{CAT_ICON[c.category]} {c.category}</span>
                <div style={{ flex:1, margin:"0 12px", height:5, background:T.surface2, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${totalIssues?(c.total/totalIssues)*100:0}%`, background:T.cyan, borderRadius:3, transition:"width 0.6s ease" }} />
                </div>
                <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                  <span style={{ fontWeight:600, color:T.text }}>{c.total}</span>
                  <span style={{ color:"#10b981", fontSize:11 }}>{c.resolved_pct??0}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Heatmap-style category grid */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
          <span>🔥</span>
          <h3 style={{ fontSize:14, fontWeight:700, color:T.text, margin:0, textTransform:"uppercase", letterSpacing:"0.05em" }}>Issue Hotspot Grid</h3>
        </div>
        <p style={{ fontSize:12, color:T.muted, marginBottom:16 }}>Colour intensity = relative volume. Red = high load.</p>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:10 }}>
          {byCategory.length === 0
            ? CATEGORIES.map(cat => (
                <div key={cat} style={{ padding:"14px 12px", borderRadius:12, background:"rgba(255,255,255,0.04)", border:T.border, textAlign:"center" }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{CAT_ICON[cat]}</div>
                  <div style={{ fontSize:12, color:T.dim, textTransform:"capitalize" }}>{cat}</div>
                  <div style={{ fontSize:18, fontWeight:700, color:T.dim, marginTop:4 }}>0</div>
                </div>
              ))
            : byCategory.map(c => {
                const h = heatColor(c.total);
                return (
                  <div key={c.category} style={{ padding:"14px 12px", borderRadius:12, background:h.bg, border:`1px solid ${h.border}`, textAlign:"center", transition:"all 0.2s" }}>
                    <div style={{ fontSize:22, marginBottom:4 }}>{CAT_ICON[c.category]}</div>
                    <div style={{ fontSize:12, color:h.text, textTransform:"capitalize", fontWeight:500 }}>{c.category}</div>
                    <div style={{ fontSize:22, fontWeight:700, color:h.text, marginTop:4 }}>{c.total}</div>
                    <div style={{ fontSize:11, color:T.dim, marginTop:2 }}>{c.resolved_pct??0}% resolved</div>
                  </div>
                );
              })
          }
        </div>
      </Card>

      {/* SLA compliance + response time table */}
      <Card>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
          <span>⚡</span>
          <h3 style={{ fontSize:14, fontWeight:700, color:T.text, margin:0, textTransform:"uppercase", letterSpacing:"0.05em" }}>SLA & Response Times</h3>
        </div>
        <p style={{ fontSize:12, color:T.muted, marginBottom:16 }}>Resolution rate and average time per category.</p>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                {["Category","Total","Resolved","SLA Compliance","Avg Resolution"].map(h => (
                  <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:T.dim, fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byCategory.length === 0 ? (
                <tr><td colSpan={5} style={{ padding:"24px 12px", textAlign:"center", color:T.dim }}>No data yet — seed demo data to populate</td></tr>
              ) : [...byCategory].sort((a,b)=>b.total-a.total).map((c, i) => {
                const pct = c.resolved_pct ?? 0;
                const slaColor = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
                return (
                  <tr key={c.category} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?"transparent":"rgba(255,255,255,0.02)" }}>
                    <td style={{ padding:"10px 12px", fontWeight:500, color:T.text }}>{CAT_ICON[c.category]} {c.category}</td>
                    <td style={{ padding:"10px 12px", color:T.muted }}>{c.total}</td>
                    <td style={{ padding:"10px 12px", color:"#10b981" }}>{c.resolved_count??0}</td>
                    <td style={{ padding:"10px 12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ flex:1, height:5, background:T.surface2, borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:slaColor, borderRadius:3, transition:"width 0.6s ease" }} />
                        </div>
                        <span style={{ fontSize:12, fontWeight:600, color:slaColor, minWidth:32 }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding:"10px 12px", color:T.muted }}>
                      {c.avg_resolution_hours ? `${c.avg_resolution_hours}h` : <span style={{ color:T.dim }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => api.getStoredUser());
  const [view, setView] = useState("issues");
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isMobile } = useResponsive();
  const { lang, setLang, t } = useTranslation();
  const effectiveSidebarOpen = isMobile ? sidebarOpen && sidebarOpen : sidebarOpen;

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const handleLogin = (u) => { setUser(u); showToast(`${t("welcome")}, ${u.name}!`); };
  const handleLogout = async () => { await api.logout(); setUser(null); setView("issues"); showToast(t("sign_out")); };

  if (!user) return (
    <>
      <HeroGeometric badge="Civic Issue Tracker" title1="Report & Track" title2="Civic Issues" />
      <div id="dashboard"><AuthScreen onLogin={handleLogin} lang={lang} setLang={setLang} t={t} /></div>
    </>
  );

  const NAV_MAIN = [
    { id:"issues", label: user.role==="citizen" ? t("my_reports") : t("dashboard"), icon:"⊞" },
    ...(user.role === "citizen" ? [{ id:"tracker", label: "Report Status", icon:"📋" }] : []),
  ];
  const NAV_TOOLS = user.role !== "citizen" ? [
    { id:"analytics", label: t("analytics"), icon:"📊" },
  ] : [];

  const NavBtn = ({ item }) => (
    <button onClick={() => { setView(item.id); setSelectedIssueId(null); }}
      style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:sidebarOpen?"10px 14px":"10px", borderRadius:10, background:view===item.id?"rgba(6,182,212,0.12)":"transparent", border:`1px solid ${view===item.id?"rgba(6,182,212,0.3)":"transparent"}`, color:view===item.id?T.cyan:T.muted, cursor:"pointer", transition:"all 0.15s", fontSize:14, fontWeight:view===item.id?600:400, marginBottom:2, textAlign:"left" }}>
      <span style={{ fontSize:17, flexShrink:0 }}>{item.icon}</span>
      {sidebarOpen && <span>{item.label}</span>}
    </button>
  );

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", background:T.bg }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Mobile sidebar overlay backdrop ── */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:99, backdropFilter:"blur(4px)" }} />
      )}

      {/* ── Mobile hamburger ── */}
      {isMobile && !sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)}
          style={{ position:"fixed", top:12, left:12, zIndex:50, width:40, height:40, borderRadius:10, background:"rgba(13,27,46,0.95)", border:`1px solid ${T.border}`, color:T.text, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(20px)", boxShadow:"0 4px 16px rgba(0,0,0,0.3)" }}>
          ☰
        </button>
      )}

      {/* ── Sidebar matching TrustLens ── */}
      <div style={{
        width: isMobile ? 260 : (sidebarOpen?220:64),
        background:"rgba(13,27,46,0.95)",
        borderRight: isMobile ? "none" : `1px solid ${T.border}`,
        transition:"transform 0.3s ease, width 0.25s ease",
        display:"flex", flexDirection:"column", flexShrink:0, backdropFilter:"blur(20px)",
        position: isMobile ? "fixed" : "relative",
        top: isMobile ? 0 : undefined,
        left: isMobile ? 0 : undefined,
        zIndex: isMobile ? 100 : undefined,
        height: isMobile ? "100vh" : undefined,
        transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "none",
      }}>

        {/* Logo */}
        <div style={{ padding:isMobile ? "18px 16px" : (sidebarOpen?"22px 18px 18px":"22px 14px 18px"), borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:10, cursor:"pointer", justifyContent:isMobile?"space-between":"flex-start" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, background:T.gradBtn, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, boxShadow:"0 0 12px rgba(6,182,212,0.4)" }}>🏛️</div>
            {(isMobile || sidebarOpen) && (
              <div>
                <div style={{ color:T.text, fontWeight:700, fontSize:15, lineHeight:1, background:T.grad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{t("app_name")}</div>
                <div style={{ color:T.dim, fontSize:10, marginTop:2 }}>Issue Platform</div>
              </div>
            )}
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)}
              style={{ background:"none", border:"none", color:T.muted, fontSize:20, cursor:"pointer", padding:"4px" }}>✕</button>
          )}
          {!isMobile && (
            <div style={{ marginLeft:"auto", cursor:"pointer" }} onClick={() => setSidebarOpen(o => !o)}>
              {sidebarOpen ? "◀" : "▶"}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"12px 8px", overflowY:"auto" }}>
          {(isMobile || sidebarOpen) && <div style={{ fontSize:10, color:T.dim, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", padding:"4px 8px 8px" }}>MAIN</div>}
          {NAV_MAIN.map(n => <NavBtn key={n.id} item={n} />)}

          {NAV_TOOLS.length > 0 && (
            <>
              {(isMobile || sidebarOpen) && <div style={{ fontSize:10, color:T.dim, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", padding:"12px 8px 8px" }}>TOOLS</div>}
              {NAV_TOOLS.map(n => <NavBtn key={n.id} item={n} />)}
            </>
          )}
        </nav>

        {/* User footer */}
        <div style={{ padding: isMobile ? "14px 16px" : "14px 10px", borderTop:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:(isMobile||sidebarOpen)?10:0 }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:ROLE_COLOR[user.role]||T.cyan, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:13, flexShrink:0, boxShadow:`0 0 8px ${ROLE_COLOR[user.role]||T.cyan}66` }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            {(isMobile || sidebarOpen) && (
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:T.text, fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name}</div>
                <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", display:"inline-block" }} />
                  <span style={{ color:T.dim, fontSize:11, textTransform:"capitalize" }}>{t("active")}</span>
                </div>
              </div>
            )}
          </div>
          {(isMobile || sidebarOpen) && (
            <>
              <select value={lang} onChange={e => setLang(e.target.value)}
                title={t("select_language")}
                style={{ width:"100%", marginBottom:8, padding:"7px 10px", borderRadius:8, background:"rgba(255,255,255,0.05)", border:`1px solid ${T.border}`, color:T.muted, fontSize:12, cursor:"pointer", outline:"none" }}
                onFocus={e => (e.target.style.borderColor = T.cyan)}
                onBlur={e => (e.target.style.borderColor = T.border)}>
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
              <button onClick={handleLogout} style={{ width:"100%", padding:"8px", borderRadius:8, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#fca5a5", fontSize:12, cursor:"pointer", fontWeight:500, transition:"all 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,0.15)"}
                onMouseLeave={e => e.currentTarget.style.background="rgba(239,68,68,0.08)"}>
                🚪 {t("logout")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex:1, overflow:"auto", paddingTop: isMobile && !sidebarOpen ? 60 : 0 }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding: isMobile ? "16px" : "32px" }}>
          {view==="issues" && selectedIssueId===null && (
            <IssueList user={user}
              onSelect={id => { setSelectedIssueId(id); setView("detail"); }}
              onCreate={() => setView("create")} />
          )}
          {view==="detail" && selectedIssueId && (
            <IssueDetail issueId={selectedIssueId} user={user}
              onBack={() => { setSelectedIssueId(null); setView("issues"); }}
              onUpdated={() => showToast("Issue updated")} />
          )}
          {view==="create" && (
            <CreateIssue
              onCreated={issue => { showToast("Issue reported!"); setSelectedIssueId(issue.id); setView("detail"); }}
              onCancel={() => setView("issues")} />
          )}
          {view==="analytics" && <Analytics user={user} />}
          {view==="tracker" && (
            <ReportTracker user={user}
              onSelect={id => { setSelectedIssueId(id); setView("detail"); }} />
          )}
        </div>
      </div>

      <Chatbot role={user.role} onNavigate={(target) => { setView(target); setSelectedIssueId(null); }} userName={user.name} />
    </div>
  );
}
