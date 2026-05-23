import { useState } from "react";
import { api } from "../api.js";
import { useTranslation } from "../useTranslation.js";
import { useResponsive } from "../useResponsive.js";
import { T, CATEGORIES, PRIORITIES, CAT_ICON } from "../theme.js";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";
import { Inp, Sel } from "./ui/Input.jsx";
import LocationPicker from "../LocationPicker.jsx";
import ImageUpload from "../ImageUpload.jsx";

export default function CreateIssue({ onCreated, onCancel }) {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();
  const [form, setForm] = useState({ title:"", description:"", category:"roads", priority:"medium", location:{ address:"", lat:"", lng:"" } });
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (form.title.length < 5) e.title = "Title must be at least 5 characters";
    if (form.description.length < 10) e.description = "Description must be at least 10 characters";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    const payload = { ...form, attachments, location: form.location.address ? { address:form.location.address, lat:parseFloat(form.location.lat)||0, lng:parseFloat(form.location.lng)||0 } : undefined };
    try {
      const res = await api.createIssue(payload);
      if (res?.success && res.data?.issue) {
        onCreated(res.data.issue);
      } else {
        setErrors({ submit: res?.message || "Failed to create issue." });
      }
    } catch {
      setErrors({ submit: "Failed to create issue." });
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <Button variant="ghost" onClick={onCancel}>← {t("cancel")}</Button>
        <h2 style={{ fontSize:20, fontWeight:700, color:T.text, margin:0 }}>{t("report_issue")}</h2>
      </div>
      <div style={{ maxWidth: "100%" }}>
        <Card>
          <div style={{ display:"flex", flexDirection:"column", gap: isMobile ? 14 : 18 }}>
            <div>
              <Inp label={`${t("title")} *`} value={form.title} onChange={e => set("title", e.target.value)} placeholder={t("issue_title")} />
              {errors.title && <p style={{ color:"#fca5a5", fontSize:12, marginTop:4 }}>{errors.title}</p>}
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:500, color:T.muted, display:"block", marginBottom:6 }}>{t("description")} *</label>
              <textarea rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder={t("describe_issue")}
                style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${T.border}`, fontSize:14, resize:"vertical", outline:"none", color:T.text, background:"rgba(255,255,255,0.05)", boxSizing:"border-box" }} />
              {errors.description && <p style={{ color:"#fca5a5", fontSize:12, marginTop:4 }}>{errors.description}</p>}
            </div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <Sel label={t("category")} value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
              </Sel>
              <Sel label={t("priority")} value={form.priority} onChange={e => set("priority", e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </Sel>
            </div>
            <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:12, padding:16, border:`1px solid ${T.border}` }}>
              <h4 style={{ fontSize:13, fontWeight:600, color:T.muted, marginTop:0, marginBottom:12 }}>📍 {t("location")} (optional)</h4>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <Inp placeholder={t("address")} value={form.location.address} onChange={e => setForm(f => ({ ...f, location:{ ...f.location, address:e.target.value } }))} />
                <LocationPicker
                  value={form.location}
                  onChange={loc => setForm(f => ({ ...f, location:{ ...f.location, lat:loc.lat, lng:loc.lng } }))}
                />
              </div>
            </div>
            {errors.submit && <div style={{ color:"#fca5a5", fontSize:13, background:"rgba(239,68,68,0.08)", padding:"10px 14px", borderRadius:10, border:"1px solid rgba(239,68,68,0.2)" }}>⚠ {errors.submit}</div>}
            <div>
              <label style={{ fontSize:13, fontWeight:500, color:T.muted, display:"block", marginBottom:6 }}>📎 Photo (optional)</label>
              <ImageUpload onUploaded={url => setAttachments(a => [...a, url])} />
              {attachments.length > 0 && (
                <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                  {attachments.map((url, i) => (
                    <div key={i} style={{ position:"relative" }}>
                      <img src={url} alt="" style={{ width:64, height:64, objectFit:"cover", borderRadius:8, border:`1px solid ${T.border}` }} />
                      <button onClick={() => setAttachments(a => a.filter((_, j) => j !== i))}
                        style={{ position:"absolute", top:-6, right:-6, width:18, height:18, borderRadius:"50%", background:"#ef4444", border:"none", color:"#fff", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
              <Button variant="secondary" onClick={onCancel}>{t("cancel")}</Button>
              <Button onClick={handleSubmit} disabled={loading}>{loading ? t("submitting") : t("submit")}</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
