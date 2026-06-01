import { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import { useTranslation } from "./useTranslation.js";
import IndiaMap from "./IndiaMap.jsx";
import { useResponsive } from "./useResponsive.js";

const T = {
  bg: "#0a0f1e", surface: "rgba(255,255,255,0.04)", surface2: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.08)", text: "#e2e8f0", muted: "#94a3b8", dim: "#475569",
  cyan: "#06b6d4",
};

export default function HeatmapDashboard() {
  const { t, lang } = useTranslation();
  const { isMobile } = useResponsive();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getIssues({ limit: 200 });
    if (res?.success) {
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setIssues(list);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCount = issues.filter(i => i.status === "open").length;
  const inProgCount = issues.filter(i => i.status === "in_progress").length;
  const resolvedCount = issues.filter(i => ["resolved", "closed"].includes(i.status)).length;
  const unresolvedCount = issues.filter(i => ["open","in_progress","rejected"].includes(i.status)).length;
  const totalCount = issues.length;

  return (
    <div>
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: T.text, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
          🇮🇳 {t("india_heatmap")}
        </h2>
        <p style={{ color: T.muted, fontSize: 13, margin: 0 }}>
          {t("issues_per_state")} — language changes auto-zoom to the corresponding state
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total Issues", value: totalCount, icon: "📋", color: T.text },
          { label: "Open", value: openCount, icon: "📝", color: "#f59e0b" },
          { label: "In Progress", value: inProgCount, icon: "🔄", color: "#06b6d4" },
          { label: "Unresolved", value: unresolvedCount, icon: "🟠", color: "#f97316" },
          { label: "Resolved", value: resolvedCount, icon: "✅", color: "#10b981" },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: T.muted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{loading ? "…" : s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: T.muted }}>🗺 Hover over a state to see issue count | Language auto-zooms</span>
        <button onClick={load} style={{
          marginLeft: "auto", padding: "6px 14px", borderRadius: 8, fontSize: 12,
          background: T.surface2, border: `1px solid ${T.border}`, color: T.text, cursor: "pointer",
        }}>↻ Refresh</button>
      </div>

      <IndiaMap issues={issues} lang={lang} />

      {loading && (
        <div style={{ textAlign: "center", padding: 24, color: T.dim, fontSize: 13 }}>
          Loading issue data for the map…
        </div>
      )}
    </div>
  );
}
