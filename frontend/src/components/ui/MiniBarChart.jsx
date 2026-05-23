import { T } from "../../theme.js";

const COLORS = {
  open:"#06b6d4", in_progress:"#f59e0b", resolved:"#10b981",
  closed:"#64748b", rejected:"#ef4444",
  roads:"#06b6d4", sanitation:"#10b981", water:"#38bdf8",
  electricity:"#fbbf24", parks:"#4ade80", safety:"#ef4444", other:"#a855f7",
};

export default function MiniBarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <span style={{ fontSize:10, color:T.text, fontWeight:600 }}>{d.value}</span>
          <div style={{
            width:"100%", background:COLORS[d.key]||T.cyan,
            borderRadius:"3px 3px 0 0",
            height:`${Math.max((d.value/max)*60, d.value>0?8:0)}px`,
            transition:"height 0.4s ease", opacity:0.8,
          }} />
          <span style={{ fontSize:9, color:T.dim, textAlign:"center", lineHeight:1.2 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}
