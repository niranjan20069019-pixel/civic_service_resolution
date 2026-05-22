import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STATUS_COLOR = {
  open: "#06b6d4", in_progress: "#f59e0b", resolved: "#10b981",
  closed: "#64748b", rejected: "#ef4444",
};

function colorIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    html: svg, className: "", iconSize: [24, 36], iconAnchor: [12, 36], popupAnchor: [0, -36],
  });
}

// Recenter map when issues change
function Recenter({ issues }) {
  const map = useMap();
  useEffect(() => {
    const pts = issues.filter(i => i.location?.lat && i.location?.lng);
    if (pts.length === 0) return;
    if (pts.length === 1) { map.setView([pts[0].location.lat, pts[0].location.lng], 14); return; }
    const bounds = L.latLngBounds(pts.map(i => [i.location.lat, i.location.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [issues]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const CAT_ICON = { roads:"🛣️", sanitation:"🗑️", water:"💧", electricity:"⚡", parks:"🌳", safety:"🚨", other:"📋" };

export default function IssueMap({ issues = [], onSelect }) {
  const mapped = issues.filter(i => i.location?.lat && i.location?.lng);

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", height: 380 }}>
      <MapContainer
        center={[12.9716, 77.5946]}
        zoom={12}
        style={{ height: "100%", width: "100%", background: "#0d1b2e" }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />
        <Recenter issues={mapped} />
        {mapped.map(issue => (
          <Marker
            key={issue.id}
            position={[issue.location.lat, issue.location.lng]}
            icon={colorIcon(STATUS_COLOR[issue.status] || "#06b6d4")}
            eventHandlers={{ click: () => onSelect?.(issue.id) }}
          >
            <Popup>
              <div style={{ minWidth: 180, fontFamily: "Inter, sans-serif" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {CAT_ICON[issue.category]} {issue.title}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  {issue.location.address || `${issue.location.lat.toFixed(4)}, ${issue.location.lng.toFixed(4)}`}
                </div>
                <span style={{
                  display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 11,
                  fontWeight: 600, background: STATUS_COLOR[issue.status] + "22",
                  color: STATUS_COLOR[issue.status], border: `1px solid ${STATUS_COLOR[issue.status]}44`,
                }}>
                  {issue.status.replace("_", " ")}
                </span>
                {onSelect && (
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => onSelect(issue.id)}
                      style={{ fontSize: 12, color: "#06b6d4", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      View details →
                    </button>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {mapped.length === 0 && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", color: "#475569", fontSize: 14, pointerEvents: "none",
        }}>
          No issues with location data
        </div>
      )}
    </div>
  );
}
