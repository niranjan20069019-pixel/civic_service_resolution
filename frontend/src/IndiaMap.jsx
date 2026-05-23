import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

const STATE_LANG_MAP = {
  en: null, hi: null, ta: "Tamil Nadu", te: "Telangana",
  bn: "West Bengal", mr: "Maharashtra", gu: "Gujarat",
  kn: "Karnataka", ml: "Kerala", pa: "Punjab",
};

const STATE_CENTROIDS = {
  "Andhra Pradesh": [15.9, 80.0], "Arunachal Pradesh": [28.2, 94.7],
  "Assam": [26.2, 92.9], "Bihar": [25.6, 85.1], "Chhattisgarh": [20.6, 81.9],
  "Goa": [15.5, 74.0], "Gujarat": [22.5, 71.5], "Haryana": [29.1, 76.0],
  "Himachal Pradesh": [31.1, 77.4], "Jharkhand": [23.6, 85.3],
  "Karnataka": [14.8, 76.0], "Kerala": [10.5, 76.2],
  "Madhya Pradesh": [23.5, 78.5], "Maharashtra": [19.0, 76.0],
  "Manipur": [24.7, 93.9], "Meghalaya": [25.5, 91.4],
  "Mizoram": [23.2, 92.9], "Nagaland": [26.2, 94.5],
  "Odisha": [20.5, 84.5], "Punjab": [31.0, 75.5],
  "Rajasthan": [26.6, 73.8], "Sikkim": [27.6, 88.5],
  "Tamil Nadu": [11.0, 78.5], "Telangana": [17.5, 79.5],
  "Tripura": [23.8, 91.5], "Uttar Pradesh": [27.0, 80.5],
  "Uttarakhand": [30.0, 79.0], "West Bengal": [23.0, 88.0],
  "Delhi": [28.7, 77.2], "Jammu & Kashmir": [33.8, 76.8],
  "Ladakh": [34.5, 77.5], "Puducherry": [11.9, 79.8],
};

function getStateFromCoords(lat, lng) {
  let closest = null;
  let minDist = Infinity;
  for (const [name, [slat, slng]] of Object.entries(STATE_CENTROIDS)) {
    const d = Math.sqrt((lat - slat) ** 2 + (lng - slng) ** 2);
    if (d < minDist) { minDist = d; closest = name; }
  }
  return minDist < 3.5 ? closest : null;
}

function getColor(density) {
  return density > 0
    ? density > 0.6 ? "#ef4444" : density > 0.3 ? "#f59e0b" : density > 0.1 ? "#06b6d4" : "#10b981"
    : "#1e293b";
}

// ── Choropleth layer (state-level fill) ──────────────────────────────────────
function ChoroplethLayer({ geoData, stateCounts, maxCount }) {
  const map = useMap();
  useEffect(() => {
    if (!geoData) return;
    const layer = L.geoJSON(geoData, {
      style: (feature) => {
        const name = feature.properties?.NAME_1 || feature.properties?.name || "";
        const count = stateCounts[name] || 0;
        const density = maxCount > 0 ? count / maxCount : 0;
        return { fillColor: getColor(density), weight: 1.2, opacity: 0.8, color: "rgba(255,255,255,0.15)", fillOpacity: 0.6 };
      },
      onEachFeature: (feature, l) => {
        const name = feature.properties?.NAME_1 || feature.properties?.name || "";
        const count = stateCounts[name] || 0;
        l.bindTooltip(`<strong>${name}</strong><br/>Issues: ${count}`, { direction: "center", className: "india-tooltip" });
        l.on("mouseover", () => { l.setStyle({ fillOpacity: 0.85, weight: 2, color: "rgba(255,255,255,0.4)" }); l.bringToFront(); });
        l.on("mouseout", () => {
          const d = maxCount > 1 ? (stateCounts[name] || 0) / maxCount : 0;
          l.setStyle({ fillColor: getColor(d), fillOpacity: 0.6, weight: 1.2, color: "rgba(255,255,255,0.15)" });
        });
      },
    });
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [geoData, stateCounts, maxCount, map]);
  return null;
}

// ── Heatmap layer (leaflet.heat) ─────────────────────────────────────────────
function HeatLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const heat = L.heatLayer(points, {
      radius: 35,
      blur: 25,
      maxZoom: 10,
      gradient: { 0.2: "#06b6d4", 0.5: "#f59e0b", 0.8: "#ef4444", 1.0: "#ffffff" },
    });
    heat.addTo(map);
    return () => { map.removeLayer(heat); };
  }, [points, map]);
  return null;
}

function AutoFocus({ lang }) {
  const map = useMap();
  useEffect(() => {
    const state = STATE_LANG_MAP[lang];
    if (state && STATE_CENTROIDS[state]) {
      map.flyTo(STATE_CENTROIDS[state], 6.5, { duration: 1.5 });
    } else {
      map.flyTo([21.5, 80.0], 5, { duration: 1.5 });
    }
  }, [lang, map]);
  return null;
}

// ── Legend ───────────────────────────────────────────────────────────────────
function HeatLegend() {
  return (
    <div style={{
      position: "absolute", bottom: 28, left: 12, zIndex: 1000,
      background: "rgba(13,27,46,0.9)", backdropFilter: "blur(12px)",
      borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
      padding: "10px 14px", fontSize: 11, color: "#94a3b8",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Intensity</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 80, height: 8, borderRadius: 4, background: "linear-gradient(to right, #06b6d4, #f59e0b, #ef4444, #fff)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span>Low</span><span>High</span>
      </div>
    </div>
  );
}

export default function IndiaMap({ issues = [], lang = "en" }) {
  const [geoData, setGeoData] = useState(null);
  const [mode, setMode] = useState("heatmap"); // "heatmap" | "choropleth"

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/niranjan-500/india-states-geojson/refs/heads/master/india_states.geojson")
      .then(r => r.json())
      .then(setGeoData)
      .catch(() => {
        fetch("https://raw.githubusercontent.com/geohacker/india/master/state/india_telangana.geojson")
          .then(r => r.json())
          .then(setGeoData)
          .catch(() => setGeoData(null));
      });
  }, []);

  const { stateCounts, maxCount } = useMemo(() => {
    const counts = {};
    (issues || []).forEach(issue => {
      if (issue.location?.lat && issue.location?.lng) {
        const state = getStateFromCoords(issue.location.lat, issue.location.lng);
        if (state) counts[state] = (counts[state] || 0) + 1;
      }
    });
    return { stateCounts: counts, maxCount: Math.max(...Object.values(counts), 1) };
  }, [issues]);

  // [lat, lng, intensity] for leaflet.heat
  const heatPoints = useMemo(() => {
    return (issues || [])
      .filter(i => i.location?.lat && i.location?.lng)
      .map(i => [i.location.lat, i.location.lng, 1]);
  }, [issues]);

  const sortedStates = useMemo(() =>
    Object.entries(stateCounts).sort((a, b) => b[1] - a[1]),
  [stateCounts]);

  const btnStyle = (active) => ({
    padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
    background: active ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${active ? "rgba(6,182,212,0.5)" : "rgba(255,255,255,0.08)"}`,
    color: active ? "#06b6d4" : "#94a3b8",
    transition: "all 0.15s",
  });

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", height: 460, position: "relative" }}>
      {/* Mode toggle */}
      <div style={{
        position: "absolute", top: 12, left: 12, zIndex: 1000,
        display: "flex", gap: 6, background: "rgba(13,27,46,0.9)",
        backdropFilter: "blur(12px)", borderRadius: 8, padding: 4,
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <button style={btnStyle(mode === "heatmap")} onClick={() => setMode("heatmap")}>🔥 Heatmap</button>
        <button style={btnStyle(mode === "choropleth")} onClick={() => setMode("choropleth")}>🗺 Choropleth</button>
      </div>

      <MapContainer
        center={[21.5, 80.0]}
        zoom={5}
        style={{ height: "100%", width: "100%", background: "#0a1220" }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <AutoFocus lang={lang} />

        {mode === "choropleth" && geoData && (
          <ChoroplethLayer geoData={geoData} stateCounts={stateCounts} maxCount={maxCount} />
        )}
        {mode === "heatmap" && heatPoints.length > 0 && (
          <HeatLayer points={heatPoints} />
        )}
      </MapContainer>

      {mode === "heatmap" && <HeatLegend />}

      {/* Hotspots sidebar */}
      {sortedStates.length > 0 && (
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 1000,
          background: "rgba(13,27,46,0.9)", backdropFilter: "blur(12px)",
          borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
          padding: "12px 14px", minWidth: 160, maxHeight: 300, overflowY: "auto",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            🔥 Hotspots
          </div>
          {sortedStates.slice(0, 8).map(([name, count]) => {
            const density = maxCount > 0 ? count / maxCount : 0;
            const color = getColor(density);
            const pct = Math.round(density * 100);
            return (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ color: "#e2e8f0", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
                <span style={{ color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>{count}</span>
                <div style={{ width: 30, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === "heatmap" && heatPoints.length === 0 && (
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
          background: "rgba(13,27,46,0.85)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
          padding: "6px 14px", fontSize: 11, color: "#94a3b8",
        }}>
          No geo-tagged issues yet — submit issues with a location to see the heatmap
        </div>
      )}

      {!geoData && mode === "choropleth" && (
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
          background: "rgba(239,68,68,0.1)", backdropFilter: "blur(8px)",
          borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)",
          padding: "6px 14px", fontSize: 11, color: "#fca5a5",
        }}>
          Map boundaries loading…
        </div>
      )}
    </div>
  );
}
