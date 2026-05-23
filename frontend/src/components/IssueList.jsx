import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { useTranslation } from "../useTranslation.js";
import { useResponsive } from "../useResponsive.js";
import { useSocket } from "../useSocket.js";
import { T, CATEGORIES, STATUSES, PRIORITIES, STATUS_META, PRIORITY_META, CAT_ICON, timeAgo } from "../theme.js";
import LanguageSelector from "./ui/LanguageSelector.jsx";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";
import MetricCard from "./ui/MetricCard.jsx";
import Badge from "./ui/Badge.jsx";
import { Inp } from "./ui/Input.jsx";
import IssueMap from "../IssueMap.jsx";

const inputBase = {
  padding:"11px 14px", borderRadius:10, border:`1px solid ${T.border}`,
  fontSize:14, outline:"none", color:T.text, background:"rgba(255,255,255,0.05)",
  width:"100%", boxSizing:"border-box", transition:"border-color 0.2s",
};

const selBase = { padding:"6px 10px", borderRadius:8, border:`1px solid ${T.border}`, fontSize:12, outline:"none", color:T.text, background:"rgba(255,255,255,0.05)", cursor:"pointer", minWidth:140 };

export default function IssueList({ user, onSelect, onCreate }) {
  const { t, lang, setLang } = useTranslation();
  const { isMobile } = useResponsive();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status:"", category:"", priority:"", search:"", page:1 });
  const [pagination, setPagination] = useState({ total:0, pages:1 });
  const [showMap, setShowMap] = useState(false);
  const [liveFlash, setLiveFlash] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusValues, setStatusValues] = useState({});
  const [updateError, setUpdateError] = useState("");

  const handleQuickStatus = async (issueId) => {
    const newStatus = statusValues[issueId];
    if (!newStatus) return;
    setUpdatingId(issueId);
    setUpdateError("");
    const res = await api.updateStatus(issueId, newStatus);
    if (res?.success) {
      setStatusValues(s => { const n={...s}; delete n[issueId]; return n; });
      load();
    } else {
      setUpdateError(res?.message || "Update failed");
    }
    setUpdatingId(null);
  };

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

  useSocket({
    onIssueCreated: () => { setLiveFlash(true); setTimeout(() => setLiveFlash(false), 2000); load(); },
    onIssueUpdated: () => { load(); },
  });

  const setF = (k, v) => setFilters(f => ({ ...f, [k]:v, page:1 }));

  const openCount = issues.filter(i => i.status === "open").length;
  const inProgressCount = issues.filter(i => i.status === "in_progress").length;
  const resolvedCount = issues.filter(i => i.status === "resolved").length;

  return (
    <div>
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

      <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:8, marginBottom: isMobile ? 20 : 28 }}>
        <Button variant="secondary" onClick={load}>↻ {t("refresh")}</Button>
        <Button variant={showMap?"primary":"ghost"} onClick={() => setShowMap(m => !m)}>🗺 {showMap ? "Hide Issues" : "Issue Map"}</Button>
        {user.role === "citizen" && (
          <Button onClick={onCreate} style={{ background:T.gradBtn, border:"none", boxShadow:"0 0 20px rgba(6,182,212,0.3)" }}>⊕ {t("new_issue")}</Button>
        )}
        {liveFlash && <span style={{ padding:"8px 14px", borderRadius:10, background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.3)", color:"#6ee7b7", fontSize:12, fontWeight:600, animation:"slideIn 0.25s ease" }}>⚡ Live update</span>}
      </div>

      {showMap && (
        <div style={{ marginBottom:24 }}>
          <IssueMap issues={issues} onSelect={onSelect} />
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap:12, marginBottom:24 }}>
        <MetricCard label={t("total_issues")} value={pagination.total} icon="📋" color={T.text} />
        <MetricCard label={t("open")} value={openCount} icon="🔵" color={T.cyan} />
        <MetricCard label={t("in_progress")} value={inProgressCount} icon="🟡" color="#f59e0b" />
        <MetricCard label={t("resolved")} value={resolvedCount} icon="✅" color="#10b981" />
      </div>

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
      {updateError && <div style={{ color:"#fca5a5", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:14 }}>⚠ {updateError}</div>}

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
          {user.role === "citizen" && <Button onClick={onCreate}>{t("report_first")}</Button>}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {issues.map(issue => (
            <Card key={issue.id} style={{ padding:"16px 20px" }}>
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
                  </div>
                  {issue.location && (
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center", marginTop:8, fontSize:12, color:T.dim }}>
                      <span>📍</span>
                      <span>{issue.location.address || "No address"}</span>
                      {issue.location.lat && (
                        <span style={{ color:T.muted }}>({issue.location.lat?.toFixed(4)}, {issue.location.lng?.toFixed(4)})</span>
                      )}
                      {issue.location.lat && (
                        <a href={`https://www.google.com/maps?q=${issue.location.lat},${issue.location.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ color:T.cyan, textDecoration:"none", marginLeft:4 }}
                          onClick={e => e.stopPropagation()}>
                          🗺
                        </a>
                      )}
                    </div>
                  )}
                  {["official","supervisor"].includes(user.role) && (
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:10, paddingTop:10, borderTop:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                      <select value={statusValues[issue.id] || ""} onChange={e => setStatusValues(s => ({ ...s, [issue.id]: e.target.value }))}
                        style={{ ...selBase, marginBottom:0 }}
                        onFocus={e => (e.target.style.borderColor = T.cyan)}
                        onBlur={e => (e.target.style.borderColor = T.border)}>
                        <option value="">Update to…</option>
                        {STATUSES.filter(s => s !== issue.status).map(s => (
                          <option key={s} value={s}>{STATUS_META[s].label}</option>
                        ))}
                      </select>
                      <Button variant="primary" disabled={!statusValues[issue.id] || updatingId===issue.id}
                        onClick={(e) => { e.stopPropagation(); handleQuickStatus(issue.id); }}
                        style={{ padding:"6px 14px", fontSize:12, minWidth:80 }}>
                        {updatingId===issue.id ? "..." : "Update"}
                      </Button>
                      <Button variant="ghost" onClick={() => onSelect(issue.id)}
                        style={{ padding:"6px 14px", fontSize:12 }}>
                        View →
                      </Button>
                    </div>
                  )}
                  {!["official","supervisor"].includes(user.role) && (
                    <div style={{ marginTop:8 }}>
                      <Button variant="ghost" onClick={() => onSelect(issue.id)}
                        style={{ padding:"6px 14px", fontSize:12 }}>
                        View Details →
                      </Button>
                    </div>
                  )}
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
          <Button variant="ghost" disabled={filters.page<=1} onClick={() => setFilters(f => ({ ...f, page:f.page-1 }))}>{t("prev")}</Button>
          <span style={{ padding:"6px 12px", fontSize:13, color:T.muted }}>{t("page_of")} {filters.page} {t("of")} {pagination.pages}</span>
          <Button variant="ghost" disabled={filters.page>=pagination.pages} onClick={() => setFilters(f => ({ ...f, page:f.page+1 }))}>{t("next")}</Button>
        </div>
      )}
    </div>
  );
}
