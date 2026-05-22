import { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import { useResponsive } from "./useResponsive.js";

const T = {
  bg: "#0a0f1e", surface: "rgba(255,255,255,0.04)", surface2: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.08)", text: "#e2e8f0", muted: "#94a3b8", dim: "#475569",
  cyan: "#06b6d4", purple: "#a855f7", grad: "linear-gradient(90deg,#06b6d4,#a855f7)",
  gradBtn: "linear-gradient(90deg,#06b6d4 0%,#a855f7 100%)",
};

const STATUS_STEPS = [
  { key: "open", label: "Reported", icon: "📝", color: "#06b6d4" },
  { key: "in_progress", label: "In Progress", icon: "🔄", color: "#f59e0b" },
  { key: "resolved", label: "Resolved", icon: "✅", color: "#10b981" },
  { key: "closed", label: "Closed", icon: "📋", color: "#64748b" },
  { key: "rejected", label: "Rejected", icon: "❌", color: "#ef4444" },
];

const CAT_ICON = { roads: "🛣️", sanitation: "🗑️", water: "💧", electricity: "⚡", parks: "🌳", safety: "🚨", other: "📋" };

function Pipeline({ currentStatus }) {
  const idx = STATUS_STEPS.findIndex(s => s.key === currentStatus);
  const activeIdx = idx >= 0 ? idx : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "10px 0 6px" }}>
      {STATUS_STEPS.map((step, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        const color = done ? step.color : active ? step.color : T.dim;
        const bg = done ? step.color + "22" : active ? step.color + "18" : "transparent";
        const borderColor = done ? step.color + "66" : active ? step.color + "88" : T.border;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 13, background: bg, border: `2px solid ${borderColor}`,
                color, transition: "all 0.3s", boxShadow: active ? `0 0 8px ${step.color}55` : "none",
              }}>
                {done ? "✓" : step.icon}
              </div>
              <span style={{ fontSize: 8, color: active ? step.color : T.dim, fontWeight: active ? 600 : 400, textAlign: "center", lineHeight: 1.2, maxWidth: 50 }}>
                {step.label}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < activeIdx ? STATUS_STEPS[i].color + "66" : T.border, margin: "0 2px", marginBottom: 16, borderRadius: 1, transition: "background 0.3s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SLABar({ sla }) {
  if (!sla) return null;
  const pct = sla.pct_elapsed || 0;
  const breached = sla.status === "breached";
  const warning = sla.status === "warning";
  const met = sla.status === "met";
  const color = breached ? "#ef4444" : warning ? "#f59e0b" : met ? "#10b981" : T.cyan;
  const label = sla.deadline_label || "";
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: T.muted }}>⏱ {sla.effective_sla_hours}h SLA</span>
        <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
      </div>
      <div style={{ height: 6, background: T.surface2, borderRadius: 3, overflow: "hidden", position: "relative" }}>
        <div style={{
          height: "100%", width: `${Math.min(pct, 100)}%`, background: color,
          borderRadius: 3, transition: "width 0.6s ease, background 0.3s",
          boxShadow: breached ? "0 0 6px #ef4444" : "none",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 9, color: T.dim }}>0%</span>
        <span style={{ fontSize: 9, color: breached ? "#ef4444" : T.dim }}>
          {pct >= 80 && !breached ? "⚠ Escalation threshold (80%)" : `${Math.round(pct)}% elapsed`}
        </span>
        <span style={{ fontSize: 9, color: T.dim }}>100%</span>
      </div>
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return null;
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
    <div style={{ width: 32, height: 32, border: "3px solid " + T.border, borderTop: "3px solid " + T.cyan, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
  </div>
);

export default function ReportTracker({ user, onSelect }) {
  const [issues, setIssues] = useState([]);
  const [slaMap, setSlaMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const { isMobile } = useResponsive();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getIssues({ limit: 50 });
    if (res?.success) {
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setIssues(list);
      const slaPromises = list.map(issue =>
        api.getIssueSLA(issue.id).then(r => ({ id: issue.id, sla: r.success ? r.data : null })).catch(() => ({ id: issue.id, sla: null }))
      );
      const slaResults = await Promise.all(slaPromises);
      const map = {};
      slaResults.forEach(r => { map[r.id] = r.sla; });
      setSlaMap(map);
    } else {
      setError(res?.message || "Failed to load.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = [...issues].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === "deadline") {
      const sa = slaMap[a.id]; const sb = slaMap[b.id];
      return (sa?.remaining_hours ?? 999) - (sb?.remaining_hours ?? 999);
    }
    if (sortBy === "status") return a.status.localeCompare(b.status);
    return 0;
  });

  const openCount = issues.filter(i => i.status === "open").length;
  const inProgressCount = issues.filter(i => i.status === "in_progress").length;
  const resolvedCount = issues.filter(i => ["resolved", "closed"].includes(i.status)).length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 20 : 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: isMobile ? 22 : 24, fontWeight: 700, color: T.text, margin: "0 0 4px" }}>
              📋 {user.name?.split(" ")[0]}'s Report Status
            </h2>
            <p style={{ color: T.muted, fontSize: 13, margin: 0 }}>
              Track your reports from submission to resolution
            </p>
          </div>
          <button onClick={load} style={{
            padding: "8px 16px", borderRadius: 10, background: T.surface2,
            border: "1px solid " + T.border, color: T.text, fontSize: 12, cursor: "pointer",
            fontWeight: 500, display: "flex", alignItems: "center", gap: 6,
          }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Mini stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total Reports", value: issues.length, icon: "📋", color: T.text },
          { label: "Open", value: openCount, icon: "📝", color: "#06b6d4" },
          { label: "In Progress", value: inProgressCount, icon: "🔄", color: "#f59e0b" },
          { label: "Resolved", value: resolvedCount, icon: "✅", color: "#10b981" },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface, borderRadius: 12, border: "1px solid " + T.border, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: T.muted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Sort */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: T.muted }}>Sort by:</span>
        {["newest", "oldest", "deadline", "status"].map(s => (
          <button key={s} onClick={() => setSortBy(s)} style={{
            padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500,
            background: sortBy === s ? "rgba(6,182,212,0.12)" : T.surface,
            border: "1px solid " + (sortBy === s ? "rgba(6,182,212,0.3)" : T.border),
            color: sortBy === s ? T.cyan : T.muted, cursor: "pointer", textTransform: "capitalize",
          }}>
            {s === "deadline" ? "⏱ Deadline" : s}
          </button>
        ))}
      </div>

      {loading && <Spinner />}

      {error && (
        <div style={{ color: "#fca5a5", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px", fontSize: 14, marginBottom: 16 }}>
          ⚠ {error}
        </div>
      )}

      {!loading && sorted.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "60px 0", color: T.muted }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
          <p style={{ fontSize: 17, fontWeight: 600, color: T.text, marginBottom: 8 }}>No reports yet</p>
          <p style={{ fontSize: 13, color: T.dim }}>When you report civic issues, you'll see their status here.</p>
        </div>
      )}

      {/* Issue cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {sorted.map(issue => {
          const sla = slaMap[issue.id];
          const stepIdx = STATUS_STEPS.findIndex(s => s.key === issue.status);
          const statusMeta = STATUS_STEPS[stepIdx] || STATUS_STEPS[0];

          return (
            <div
              key={issue.id}
              onClick={() => onSelect?.(issue.id)}
              style={{
                background: T.surface, borderRadius: 16, border: "1px solid " + T.border,
                padding: isMobile ? "14px 16px" : "18px 22px", cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(6,182,212,0.08)"; e.currentTarget.style.borderColor = "rgba(6,182,212,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = T.border; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{CAT_ICON[issue.category]}</span>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {issue.title}
                    </h3>
                  </div>
                  {issue.location?.address && (
                    <div style={{ fontSize: 12, color: T.dim, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                      📍 {issue.location.address}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: T.dim }}>
                    #{issue.id?.slice(0, 8)} · reported {timeAgo(issue.createdAt)}
                  </div>
                </div>
                <div style={{
                  padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: statusMeta.color + "18", color: statusMeta.color,
                  border: "1px solid " + statusMeta.color + "44", whiteSpace: "nowrap",
                }}>
                  {statusMeta.icon} {statusMeta.label}
                </div>
              </div>

              <Pipeline currentStatus={issue.status} />
              <SLABar sla={sla} />

              {issue.assignedTo && (
                <div style={{ marginTop: 8, fontSize: 11, color: T.cyan, display: "flex", alignItems: "center", gap: 4 }}>
                  ● Assigned to official
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
