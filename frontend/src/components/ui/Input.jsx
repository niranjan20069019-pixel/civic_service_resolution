import { T } from "../../theme.js";

const inputBase = {
  padding:"11px 14px", borderRadius:10, border:`1px solid ${T.border}`,
  fontSize:14, outline:"none", color:T.text, background:"rgba(255,255,255,0.05)",
  width:"100%", boxSizing:"border-box", transition:"border-color 0.2s",
};

export function Inp({ label, icon, ...props }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {label && <label style={{ fontSize:13, fontWeight:500, color:T.muted }}>{label}</label>}
      <div style={{ position:"relative" }}>
        {icon && (
          <span style={{
            position:"absolute", left:12, top:"50%",
            transform:"translateY(-50%)", color:T.muted, fontSize:15,
          }}>
            {icon}
          </span>
        )}
        <input
          style={{ ...inputBase, paddingLeft: icon ? 38 : 14 }}
          onFocus={e => (e.target.style.borderColor = T.cyan)}
          onBlur={e => (e.target.style.borderColor = T.border)}
          {...props}
        />
      </div>
    </div>
  );
}

export function Sel({ label, children, ...props }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {label && <label style={{ fontSize:13, fontWeight:500, color:T.muted }}>{label}</label>}
      <select
        style={{ ...inputBase, cursor:"pointer" }}
        onFocus={e => (e.target.style.borderColor = T.cyan)}
        onBlur={e => (e.target.style.borderColor = T.border)}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
