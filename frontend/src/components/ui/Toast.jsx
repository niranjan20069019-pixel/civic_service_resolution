import { T } from "../../theme.js";

export default function Toast({ msg, type="success" }) {
  const c = type === "success"
    ? { bg:"rgba(16,185,129,0.12)", border:"rgba(16,185,129,0.3)", text:"#6ee7b7" }
    : { bg:"rgba(239,68,68,0.12)", border:"rgba(239,68,68,0.3)", text:"#fca5a5" };
  return (
    <div style={{
      position:"fixed", top:24, right:24, zIndex:9999,
      background:c.bg, border:`1px solid ${c.border}`,
      backdropFilter:"blur(16px)", color:c.text,
      padding:"10px 16px", borderRadius:12, fontWeight:500, fontSize:13,
      boxShadow:"0 8px 32px rgba(0,0,0,0.4)", animation:"slideIn 0.25s ease",
    }}>
      {type === "success" ? "✓" : "✗"} {msg}
    </div>
  );
}
