import { useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const pinIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 24 36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#06b6d4" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="#fff"/>
  </svg>`,
  className: "",
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -40],
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPicker({ value, onChange }) {
  // value: { address, lat, lng }
  const [pin, setPin] = useState(
    value?.lat && value?.lng ? { lat: value.lat, lng: value.lng } : null
  );

  const handlePick = useCallback(({ lat, lng }) => {
    const rounded = { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
    setPin(rounded);
    onChange({ ...value, lat: rounded.lat, lng: rounded.lng });
  }, [value, onChange]);

  const handleClear = () => {
    setPin(null);
    onChange({ ...value, lat: "", lng: "" });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          {pin
            ? `📍 ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`
            : "Click on the map to drop a pin"}
        </span>
        {pin && (
          <button
            type="button"
            onClick={handleClear}
            style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            ✕ Clear
          </button>
        )}
      </div>
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", height: 260, cursor: "crosshair" }}>
        <MapContainer
          center={pin ? [pin.lat, pin.lng] : [12.9716, 77.5946]}
          zoom={pin ? 15 : 12}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          <ClickHandler onPick={handlePick} />
          {pin && <Marker position={[pin.lat, pin.lng]} icon={pinIcon} />}
        </MapContainer>
      </div>
    </div>
  );
}
