import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { useResponsive } from "../useResponsive.js";
import { T, CATEGORIES, STATUS_META, CAT_ICON } from "../theme.js";
import MetricCard from "./ui/MetricCard.jsx";
import Card from "./ui/Card.jsx";
import Badge from "./ui/Badge.jsx";
import Button from "./ui/Button.jsx";
import MiniBarChart from "./ui/MiniBarChart.jsx";

export default function Analytics({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");
  const { isMobile } = useResponsive();

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api.getAnalytics().then(res => {
      if (res?.success && res.data) setData(res.data);
      else setError(res?.message || "Failed to load analytics.");
      setLoading(false);
    }).catch(err => {
      setError(err?.message || "Network error — could not reach server.");
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
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,1fr)", gap: isMobile ? 10 : 16, marginBottom:24 }}>
        {[1,2,3,4,5].map(i => <div key={i} style={{ height: isMobile ? 80 : 100, borderRadius:16, background:"rgba(255,255,255,0.04)", animation:"pulse 1.5s ease-in-out infinite" }} />)}
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
  const unresolvedCount = byStatus.filter(s => ["open","in_progress","rejected"].includes(s.status)).reduce((s, x) => s + x.total, 0);
  const slaCompliance = totalIssues > 0 ? Math.round((resolvedCount / totalIssues) * 100) : 0;
  const avgResolutionH = byCategory.length > 0
    ? Math.round(byCategory.filter(c => c.avg_resolution_hours).reduce((s, c) => s + (c.avg_resolution_hours || 0), 0) / Math.max(byCategory.filter(c => c.avg_resolution_hours).length, 1))
    : null;

  const statusChart = byStatus.map(s => ({ key:s.status, label:STATUS_META[s.status]?.label?.slice(0,5)||s.status, value:s.total }));
  const catChart = byCategory.map(c => ({ key:c.category, label:c.category.slice(0,5), value:c.total }));

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
            <Button variant="secondary" onClick={handleSeed} disabled={seeding} style={{ fontSize:12 }}>
              {seeding ? "Seeding…" : "🌱 Seed Demo Data"}
            </Button>
          )}
          <Button variant="ghost" onClick={load} style={{ fontSize:12 }}>↻ Refresh</Button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,1fr)", gap: isMobile ? 10 : 16, marginBottom:24 }}>
        <MetricCard label="Total Issues" value={totalIssues} icon="📋" color={T.text} sub="all time" />
        <MetricCard label="Open" value={byStatus.find(s=>s.status==="open")?.total??0} icon="🔵" color={T.cyan} sub="awaiting action" />
        <MetricCard label="Unresolved" value={unresolvedCount} icon="🟠" color="#f97316" sub="open / in-progress / rejected" />
        <MetricCard label="Resolved / SLA" value={`${slaCompliance}%`} icon="🎯" color={slaCompliance >= 70 ? "#10b981" : slaCompliance >= 40 ? "#f59e0b" : "#ef4444"} sub={`${resolvedCount} resolved`} />
        <MetricCard label="Avg Resolution" value={avgResolutionH ? `${avgResolutionH}h` : "—"} icon="⏱" color="#a855f7" sub="across categories" />
      </div>

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
}
