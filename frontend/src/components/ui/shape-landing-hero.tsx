"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function FloatingCard({
  className,
  delay = 0,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function HeroGeometric({
  badge = "Civic Issue Tracker",
  title1 = "Report & Track",
  title2 = "Civic Issues",
}: {
  badge?: string;
  title1?: string;
  title2?: string;
}) {
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.9, delay: 0.3 + i * 0.2, ease: [0.25, 0.4, 0.25, 1] },
    }),
  };

  const cardStyle = "bg-[rgba(13,27,46,0.85)] backdrop-blur-md border border-white/[0.08] rounded-xl px-4 py-3 text-sm";

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0a0f1e]">

      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.08),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(168,85,247,0.06),transparent)]" />

      {/* Floating status cards — matching TrustLens floating badges */}
      <FloatingCard delay={0.8} className="right-[8%] top-[22%] hidden md:block">
        <div className={cardStyle}>
          <div className="text-[11px] text-white/40 mb-1">Road Damage Reported</div>
          <div className="text-[#ef4444] font-semibold text-xs flex items-center gap-1">
            ⚠ HIGH PRIORITY
          </div>
        </div>
      </FloatingCard>

      <FloatingCard delay={1.0} className="right-[22%] top-[12%] hidden md:block">
        <div className={cardStyle}>
          <div className="text-[11px] text-white/40 mb-1">Water Supply</div>
          <div className="text-[#10b981] font-semibold text-xs flex items-center gap-1">
            ✓ RESOLVED
          </div>
        </div>
      </FloatingCard>

      <FloatingCard delay={0.9} className="right-[6%] top-[52%] hidden md:block">
        <div className={cardStyle}>
          <div className="text-[11px] text-white/40 mb-1">Sanitation Issue</div>
          <div className="text-[#f59e0b] font-semibold text-xs flex items-center gap-1">
            ⚡ IN PROGRESS
          </div>
        </div>
      </FloatingCard>

      <FloatingCard delay={1.1} className="right-[20%] top-[55%] hidden md:block">
        <div className={cardStyle}>
          <div className="text-[11px] text-white/40 mb-1">Electricity</div>
          <div className="text-[#06b6d4] font-semibold text-xs flex items-center gap-1">
            ✓ VERIFIED
          </div>
        </div>
      </FloatingCard>

      {/* Hero content */}
      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">

          {/* Badge pill — matches TrustLens "AI Engine Active" pill */}
          <motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-10"
          >
            <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
            <span className="text-sm text-white/60 tracking-wide">{badge} — Real-Time Tracking</span>
          </motion.div>

          {/* Headline — matches TrustLens gradient headline */}
          <motion.div custom={1} variants={fadeUpVariants} initial="hidden" animate="visible">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
              <span className="text-white">
                {title1}
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#06b6d4] via-white/90 to-[#a855f7]">
                {title2}
              </span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.div custom={2} variants={fadeUpVariants} initial="hidden" animate="visible">
            <p className="text-base sm:text-lg text-white/40 mb-10 leading-relaxed font-light max-w-xl mx-auto">
              Submit, monitor, and resolve community issues — roads, sanitation, water, electricity, and more — all in real time.
            </p>
          </motion.div>

          {/* CTA buttons */}
          <motion.div custom={3} variants={fadeUpVariants} initial="hidden" animate="visible" className="flex items-center justify-center gap-4 flex-wrap">
            <button
              className="px-8 py-3 rounded-full font-semibold text-white text-sm tracking-wide transition-all"
              style={{ background:"linear-gradient(90deg,#06b6d4,#a855f7)", boxShadow:"0 0 24px rgba(6,182,212,0.35)" }}
              onClick={() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" })}
              onMouseEnter={e => (e.currentTarget.style.boxShadow="0 0 40px rgba(6,182,212,0.55)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow="0 0 24px rgba(6,182,212,0.35)")}
            >
              🏛️ Start Reporting
            </button>
            <button
              className="px-8 py-3 rounded-full bg-white/[0.06] border border-white/[0.12] text-white/70 text-sm font-medium tracking-wide hover:bg-white/[0.10] transition-colors"
              onClick={() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" })}
            >
              ▷ See Dashboard
            </button>
          </motion.div>

          {/* Stat badges — matches TrustLens "99.2% Detection Rate" row */}
          <motion.div custom={4} variants={fadeUpVariants} initial="hidden" animate="visible" className="flex items-center justify-center gap-10 mt-14 flex-wrap">
            {[
              { value: "7+", label: "Issue Categories" },
              { value: "5",  label: "Status Stages" },
              { value: "Live", label: "Real-Time Updates" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold" style={{ background:"linear-gradient(90deg,#06b6d4,#a855f7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{value}</div>
                <div className="text-xs text-white/40 mt-1">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-transparent to-[#0a0f1e]/60 pointer-events-none" />
    </div>
  );
}

export { HeroGeometric };
