import { STATUS_META, PRIORITY_META } from "../../theme.js";

export default function Badge({ status, type = "status" }) {
  const meta = type === "status" ? STATUS_META[status] : PRIORITY_META[status];
  if (!meta) return null;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600,
      letterSpacing:"0.04em", background:meta.bg, color:meta.text||meta.color,
      border:`1px solid ${meta.color}44`,
    }}>
      {type === "status" && (
        <span style={{
          width:6, height:6, borderRadius:"50%",
          background:meta.color, display:"inline-block"
        }} />
      )}
      {meta.label}
    </span>
  );
}
