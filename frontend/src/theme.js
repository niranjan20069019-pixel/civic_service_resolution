export const CATEGORIES = ["roads", "sanitation", "water", "electricity", "parks", "safety", "other"];
export const STATUSES = ["open", "in_progress", "resolved", "closed", "rejected"];
export const PRIORITIES = ["low", "medium", "high", "critical"];

export const STATUS_META = {
  open:        { label: "Open",        color: "#06b6d4", bg: "rgba(6,182,212,0.12)",   text: "#67e8f9" },
  in_progress: { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  text: "#fcd34d" },
  resolved:    { label: "Resolved",    color: "#10b981", bg: "rgba(16,185,129,0.12)",  text: "#6ee7b7" },
  unresolved:  { label: "Unresolved",  color: "#f97316", bg: "rgba(249,115,22,0.12)",  text: "#fdba74" },
  closed:      { label: "Closed",      color: "#64748b", bg: "rgba(100,116,139,0.12)", text: "#94a3b8" },
  rejected:    { label: "Rejected",    color: "#ef4444", bg: "rgba(239,68,68,0.12)",   text: "#fca5a5" },
};

export const PRIORITY_META = {
  low:      { label: "Low",      color: "#64748b", bg: "rgba(100,116,139,0.12)" },
  medium:   { label: "Medium",   color: "#06b6d4", bg: "rgba(6,182,212,0.12)"  },
  high:     { label: "High",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
};

export const CAT_ICON = {
  roads:"🛣️", sanitation:"🗑️", water:"💧", electricity:"⚡", parks:"🌳", safety:"🚨", other:"📋"
};

export const ROLE_COLOR = {
  citizen: "#06b6d4", official: "#a855f7", supervisor: "#10b981"
};

export const T = {
  bg:       "#0a0f1e",
  bg2:      "#0d1b2e",
  surface:  "rgba(255,255,255,0.04)",
  surface2: "rgba(255,255,255,0.07)",
  glass:    "rgba(13,27,46,0.8)",
  border:   "rgba(255,255,255,0.08)",
  border2:  "rgba(6,182,212,0.3)",
  text:     "#e2e8f0",
  muted:    "#94a3b8",
  dim:      "#475569",
  cyan:     "#06b6d4",
  purple:   "#a855f7",
  grad:     "linear-gradient(135deg, #06b6d4, #a855f7)",
  gradBtn:  "linear-gradient(90deg, #06b6d4 0%, #a855f7 100%)",
};

export function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function fmt(iso) {
  return iso
    ? new Date(iso).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })
    : "—";
}
