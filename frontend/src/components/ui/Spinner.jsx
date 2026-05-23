import { T } from "../../theme.js";

export default function Spinner({ size=40 }) {
  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:40 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ animation:"spin 0.8s linear infinite" }}>
        <defs>
          <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={T.cyan} />
            <stop offset="100%" stopColor={T.purple} />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="16" fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx="20" cy="20" r="16" fill="none"
          stroke="url(#spinGrad)" strokeWidth="3"
          strokeDasharray="88" strokeDashoffset="24"
          strokeLinecap="round" />
      </svg>
    </div>
  );
}
