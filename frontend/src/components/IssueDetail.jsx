import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { useTranslation } from "../useTranslation.js";
import { useResponsive } from "../useResponsive.js";
import { T, STATUSES, STATUS_META, CAT_ICON, fmt } from "../theme.js";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";
import Badge from "./ui/Badge.jsx";
import Spinner from "./ui/Spinner.jsx";
import Toast from "./ui/Toast.jsx";
import { Sel } from "./ui/Input.jsx";
import IssueMap from "../IssueMap.jsx";

export default function IssueDetail({ issueId, user, onBack, onUpdated }) {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusForm, setStatusForm] = useState({ status:"", note:"" });
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getIssue(issueId);
    if (res?.success) { setData(res.data); setStatusForm(f => ({ ...f, status:res.data.issue?.status||"" })); }
    setLoading(false);
  }, [issueId]);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async () => {
    setUpdating(true);
    const res = await api.updateStatus(issueId, statusForm.status, statusForm.note);
    if (res?.success) { showToast("Status updated"); setShowForm(false); load(); onUpdated?.(); }
    else showToast(res?.message || "Update failed", "error");
    setUpdating(false);
  };

  if (loading) return <Spinner />;
  if (!data) return <div style={{ color:"#fca5a5", padding:24 }}>Issue not found.</div>;

  const { issue, history=[] } = data;
  const canUpdate = ["official","supervisor"].includes(user.role);

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <Button variant="ghost" onClick={onBack}>← {t("back")}</Button>
        <h2 style={{ fontSize:20, fontWeight:700, color:T.text, margin:0, flex:1 }}>{t("issue_detail")}</h2>
        {canUpdate && <Button onClick={() => setShowForm(s => !s)} variant={showForm?"secondary":"primary"}>{showForm ? t("cancel") : t("update_status")}</Button>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: isMobile ? 16 : 20, alignItems:"start" }}>
        <div style={{ display:"flex", flexDirection:"column", gap: isMobile ? 12 : 16 }}>
          <Card>
            <div style={{ display:"flex", gap:12, marginBottom:16 }}>
              <span style={{ fontSize:32 }}>{CAT_ICON[issue.category]}</span>
              <div>
                <h3 style={{ fontSize:18, fontWeight:700, color:T.text, margin:"0 0 8px" }}>{issue.title}</h3>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <Badge status={issue.status} type="status" />
                  <Badge status={issue.priority} type="priority" />
                  <span style={{ fontSize:12, color:T.dim, padding:"3px 10px", background:T.surface2, borderRadius:20 }}>{issue.category}</span>
                </div>
              </div>
            </div>
            <p style={{ color:T.muted, fontSize:14, lineHeight:1.7, margin:0 }}>{issue.description}</p>
          </Card>

          {showForm && (
            <Card style={{ border:`1.5px solid ${T.cyan}`, boxShadow:`0 0 20px rgba(6,182,212,0.1)` }}>
              <h4 style={{ fontSize:14, fontWeight:600, color:T.cyan, marginTop:0 }}>{t("update_status")}</h4>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <Sel label={t("new_status")} value={statusForm.status} onChange={e => setStatusForm(f => ({ ...f, status:e.target.value }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </Sel>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ fontSize:13, fontWeight:500, color:T.muted }}>{t("note")}</label>
                  <textarea rows={3} value={statusForm.note} onChange={e => setStatusForm(f => ({ ...f, note:e.target.value }))} placeholder={t("add_note")}
                    style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${T.border}`, fontSize:14, resize:"vertical", outline:"none", color:T.text, background:"rgba(255,255,255,0.05)", width:"100%", boxSizing:"border-box" }} />
                </div>
                <Button onClick={handleStatusUpdate} disabled={updating}>{updating ? t("saving") : t("save_changes")}</Button>
              </div>
            </Card>
          )}

          <Card>
            <h4 style={{ fontSize:14, fontWeight:600, color:T.muted, marginTop:0, marginBottom:16 }}>{t("audit_trail")}</h4>
            <div style={{ position:"relative" }}>
              <div style={{ position:"absolute", left:11, top:0, bottom:0, width:2, background:T.border }} />
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {history.map((h, i) => (
                  <div key={h.id||i} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                    <div style={{ width:24, height:24, borderRadius:"50%", background:i===0?"rgba(6,182,212,0.15)":"rgba(16,185,129,0.12)", border:`2px solid ${i===0?T.cyan:"#10b981"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:10, zIndex:1, color:i===0?T.cyan:"#10b981" }}>
                      {h.action==="created"?"+":"↑"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:T.text, fontWeight:500 }}>
                        {h.action==="created" ? t("issue_created") : `${t("status_to")} ${STATUS_META[h.newValue]?.label||h.newValue}`}
                      </div>
                      {h.note && <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{h.note}</div>}
                      <div style={{ fontSize:11, color:T.dim, marginTop:2 }}>{fmt(h.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Card>
            <h4 style={{ fontSize:12, fontWeight:600, color:T.dim, marginTop:0, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Details</h4>
            {[
              ["ID", `#${issue.id?.slice(0,8)}`],
              ["Category", `${CAT_ICON[issue.category]} ${issue.category}`],
              ["Reported", fmt(issue.createdAt)],
              ["Last Update", fmt(issue.updatedAt)],
              ["First Response", issue.firstResponseAt ? fmt(issue.firstResponseAt) : "Pending"],
              ["Resolved", issue.resolvedAt ? fmt(issue.resolvedAt) : "—"],
            ].map(([k, v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                <span style={{ color:T.dim }}>{k}</span>
                <span style={{ color:T.text, fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </Card>
          {issue.location && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${T.border}` }}>
                <h4 style={{ fontSize:12, fontWeight:600, color:T.dim, margin:0, textTransform:"uppercase", letterSpacing:"0.06em" }}>📍 Report Location</h4>
                {issue.location.address && (
                  <p style={{ fontSize:13, color:T.text, margin:"6px 0 0" }}>{issue.location.address}</p>
                )}
                <p style={{ fontSize:11, color:T.muted, margin:"2px 0 0" }}>
                  {issue.location.lat?.toFixed(5)}, {issue.location.lng?.toFixed(5)}
                </p>
              </div>
              {canUpdate && issue.location.lat && issue.location.lng ? (
                <div style={{ height: 260 }}>
                  <IssueMap issues={[issue]} />
                </div>
              ) : (
                <div style={{ padding: "10px 16px" }}>
                  <a
                    href={`https://www.google.com/maps?q=${issue.location.lat},${issue.location.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:12, color:T.cyan, textDecoration:"none" }}
                  >
                    Open in Google Maps ↗
                  </a>
                </div>
              )}
              {canUpdate && (
                <div style={{ padding: "8px 16px", borderTop: `1px solid ${T.border}` }}>
                  <a
                    href={`https://www.google.com/maps?q=${issue.location.lat},${issue.location.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:12, color:T.cyan, textDecoration:"none" }}
                  >
                    Open in Google Maps ↗
                  </a>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
