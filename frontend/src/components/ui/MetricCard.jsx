import { T } from "../../theme.js";

export default function MetricCard({ label, value, sub, color=T.cyan, icon }) {
  return (
    <div
      style={{
        background:T.surface, borderRadius:16, border:`1px solid ${T.border}`,
        padding:"20px 22px", backdropFilter:"blur(12px)", transition:"border-color 0.2s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor="rgba(6,182,212,0.25)"}
      onMouseLeave={e => e.currentTarget.style.borderColor=T.border}
    >
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <span style={{
          fontSize:11, color:T.muted, fontWeight:500,
          letterSpacing:"0.08em", textTransform:"uppercase",
        }}>
          {label}
        </span>
        {icon && <span style={{ fontSize:20, opacity:0.7 }}>{icon}</span>}
      </div>
      <div style={{ fontSize:34, fontWeight:700, color, lineHeight:1.1, marginBottom:4 }}>
        {value ?? "—"}
      </div>
      {sub && <div style={{ fontSize:12, color:T.dim }}>{sub}</div>}
    </div>
  );
}
