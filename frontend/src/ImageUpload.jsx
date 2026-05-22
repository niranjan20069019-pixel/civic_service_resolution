import { useState, useRef } from "react";
import { api } from "./api.js";

export default function ImageUpload({ onUploaded }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Max file size is 5 MB"); return; }
    setError("");
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const res = await api.uploadImage(file);
    setUploading(false);
    if (res?.success) onUploaded?.(res.data.url);
    else setError(res?.message || "Upload failed");
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        style={{
          border: "2px dashed rgba(6,182,212,0.35)", borderRadius: 12, padding: "20px 16px",
          textAlign: "center", cursor: "pointer", transition: "border-color 0.2s",
          background: "rgba(6,182,212,0.04)",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(6,182,212,0.7)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(6,182,212,0.35)"}
      >
        {preview ? (
          <img src={preview} alt="preview"
            style={{ maxHeight: 140, maxWidth: "100%", borderRadius: 8, objectFit: "cover" }} />
        ) : (
          <div style={{ color: "#94a3b8", fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
            {uploading ? "Uploading…" : "Click or drag an image (JPEG/PNG/WebP, max 5 MB)"}
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
      {error && <p style={{ color: "#fca5a5", fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}
