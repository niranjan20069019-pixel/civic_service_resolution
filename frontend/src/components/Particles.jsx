import { motion } from "framer-motion";

export default function Particles() {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i, size: 1.5 + Math.random() * 3,
    x: Math.random() * 100, y: Math.random() * 100,
    driftX: (Math.random() - 0.5) * 30, driftY: -20 - Math.random() * 40,
    duration: 4 + Math.random() * 6, delay: Math.random() * 5,
    hue: i % 3 === 0 ? 182 : i % 3 === 1 ? 268 : 0,
  }));

  return (
    <div style={{ position:"fixed", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          style={{
            position:"absolute", width:p.size, height:p.size, borderRadius:"50%",
            background: `hsla(${p.hue},70%,60%,0.5)`,
            left:`${p.x}%`, top:`${p.y}%`,
            boxShadow: `0 0 ${p.size * 3}px hsla(${p.hue},70%,60%,0.3)`,
          }}
          animate={{ y: [0, p.driftY], x: [0, p.driftX], opacity: [0, 0.7, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export function IndiaSilhouette() {
  return (
    <svg viewBox="0 0 400 400" style={{ position:"absolute", width:"70%", height:"70%", top:"15%", left:"15%", opacity:0.04, pointerEvents:"none" }}>
      <path d="M200 20 C240 30 280 40 300 70 C330 100 350 140 360 180 C370 220 365 260 350 290 C335 320 310 340 280 360 C250 380 220 390 200 395 C180 390 150 380 120 360 C90 340 65 320 50 290 C35 260 30 220 40 180 C50 140 70 100 100 70 C120 40 160 30 200 20Z"
        fill="none" stroke="url(#indiaGrad)" strokeWidth="0.5" opacity="0.6" />
      <defs>
        <linearGradient id="indiaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  );
}
