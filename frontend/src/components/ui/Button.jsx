import { T } from "../../theme.js";

const VARIANTS = {
  primary:   { background:T.gradBtn, color:"#fff", border:"none", boxShadow:"0 0 20px rgba(6,182,212,0.25)" },
  secondary: { background:T.surface2, color:T.text, border:`1px solid ${T.border}` },
  danger:    { background:"rgba(239,68,68,0.1)", color:"#fca5a5", border:"1px solid rgba(239,68,68,0.3)" },
  ghost:     { background:"transparent", color:T.muted, border:`1px solid ${T.border}` },
};

export default function Button({ children, onClick, variant="primary", disabled, style={}, type="button" }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        padding:"10px 22px", borderRadius:10, fontSize:14, fontWeight:600,
        cursor:disabled?"not-allowed":"pointer", transition:"all 0.2s",
        display:"inline-flex", alignItems:"center", gap:8,
        opacity:disabled?0.5:1, ...VARIANTS[variant], ...style,
      }}
      onMouseEnter={!disabled ? e => (e.currentTarget.style.filter="brightness(1.15)") : undefined}
      onMouseLeave={!disabled ? e => (e.currentTarget.style.filter="none") : undefined}
    >
      {children}
    </button>
  );
}
