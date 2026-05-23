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
          <Button variant="ghost" disabled={filters.page<=1} onClick={() => setFilters(f => ({ ...f, page:f.page-1 }))}>{t("prev")}</Button>
          <span style={{ padding:"6px 12px", fontSize:13, color:T.muted }}>{t("page_of")} {filters.page} {t("of")} {pagination.pages}</span>
          <Button variant="ghost" disabled={filters.page>=pagination.pages} onClick={() => setFilters(f => ({ ...f, page:f.page+1 }))}>{t("next")}</Button>
        </div>
      )}
    </div>
  );
}
