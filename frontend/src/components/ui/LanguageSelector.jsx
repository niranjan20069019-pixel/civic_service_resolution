import { useState, useEffect, useRef } from "react";
import { SUPPORTED_LANGUAGES } from "../../i18n.js";
import { T } from "../../theme.js";

const flagMap = {
  en:"🇬🇧", hi:"🇮🇳", ta:"🇮🇳", te:"🇮🇳", bn:"🇮🇳",
  mr:"🇮🇳", gu:"🇮🇳", kn:"🇮🇳", ml:"🇮🇳", pa:"🇮🇳",
};

export default function LanguageSelector({ lang, setLang, t, size="small" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentName = SUPPORTED_LANGUAGES[lang] || "English";

  return (
    <div ref={ref} style={{ position:"relative", display:"inline-block" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          display:"flex", alignItems:"center", gap:6,
          padding: size==="small" ? "7px 12px" : "9px 16px", borderRadius:10,
          background:"rgba(255,255,255,0.06)",
          border:`1px solid ${open?"rgba(6,182,212,0.4)":T.border}`,
          color:T.text, fontSize: size==="small" ? 12 : 14,
          cursor:"pointer", transition:"all 0.15s", fontWeight:500,
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor="rgba(6,182,212,0.3)"}
        onMouseLeave={e => e.currentTarget.style.borderColor=open?"rgba(6,182,212,0.4)":T.border}
      >
        <span style={{ fontSize:16 }}>{flagMap[lang] || "🌐"}</span>
        <span>{currentName}</span>
        <span style={{ fontSize:9, marginLeft:2, opacity:0.6 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", right:0,
          background:"rgba(13,27,46,0.98)", backdropFilter:"blur(16px)",
          border:`1px solid ${T.border}`, borderRadius:12,
          padding:"6px", zIndex:9999, minWidth:180,
          boxShadow:"0 8px 32px rgba(0,0,0,0.5)", maxHeight:280, overflowY:"auto",
        }}>
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
            <button key={code} onClick={() => { setLang(code); setOpen(false); }}
              style={{
                display:"flex", alignItems:"center", gap:10, width:"100%",
                padding:"8px 12px", borderRadius:8,
                background:code===lang?"rgba(6,182,212,0.12)":"transparent",
                border:"none", color:code===lang?T.cyan:T.text,
                cursor:"pointer", fontSize:13, fontWeight:code===lang?600:400,
                transition:"all 0.1s", textAlign:"left",
              }}
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
