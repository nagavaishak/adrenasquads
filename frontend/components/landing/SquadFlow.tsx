"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// ── Step illustrations ────────────────────────────────────────────────────────

function FormIllustration() {
  const ring = [
    { dx: 0,   dy: 0,   w: 56, isPrimary: true  },
    { dx: -88, dy: -44, w: 36, isPrimary: false },
    { dx:  88, dy: -44, w: 36, isPrimary: false },
    { dx: -54, dy:  72, w: 36, isPrimary: false },
    { dx:  54, dy:  72, w: 36, isPrimary: false },
  ];
  return (
    <div style={{ position: "relative", width: 260, height: 240 }}>
      {/* SVG connection lines */}
      <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="260" height="240">
        {ring.slice(1).map((d, i) => (
          <motion.line
            key={i}
            x1={130} y1={120}
            x2={130 + d.dx} y2={120 + d.dy}
            stroke="rgba(255,107,0,0.22)"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.7 + i * 0.15, duration: 0.5 }}
          />
        ))}
      </svg>
      {ring.map((d, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: i === 0 ? 0.2 : 0.4 + i * 0.12,
            duration: 0.6,
            type: "spring",
            stiffness: 140,
            damping: 14,
          }}
          style={{
            position: "absolute",
            top:  "50%",
            left: "50%",
            width: d.w,
            height: d.w,
            borderRadius: "50%",
            background: d.isPrimary
              ? "radial-gradient(circle at 35% 35%, rgba(255,107,0,0.55), rgba(255,107,0,0.18))"
              : "rgba(255,255,255,0.05)",
            border: `1.5px solid ${d.isPrimary ? "rgba(255,107,0,0.9)" : "rgba(255,255,255,0.2)"}`,
            transform: `translate(calc(-50% + ${d.dx}px), calc(-50% + ${d.dy}px))`,
            boxShadow: d.isPrimary ? "0 0 28px rgba(255,107,0,0.45)" : "none",
          }}
        />
      ))}
    </div>
  );
}

function CompeteIllustration() {
  const path = "M 8 90 L 48 65 L 88 74 L 130 38 L 170 52 L 210 22 L 250 30";
  return (
    <div style={{ width: 280, height: 160 }}>
      <svg width="280" height="160" style={{ overflow: "visible" }}>
        {/* Grid */}
        {[0, 1, 2, 3].map(i => (
          <line key={i}
            x1="0" y1={30 + i * 28} x2="280" y2={30 + i * 28}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1"
          />
        ))}
        {/* Filled area */}
        <motion.path
          d={`${path} L 250 150 L 8 150 Z`}
          fill="url(#chartFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        />
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(0,255,136,0.18)" />
            <stop offset="100%" stopColor="rgba(0,255,136,0)"    />
          </linearGradient>
        </defs>
        {/* Line */}
        <motion.path
          d={path}
          fill="none"
          stroke="rgba(0,255,136,0.85)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(0,255,136,0.6))" }}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.25, duration: 1.6, ease: "easeOut" }}
        />
        {/* Live dot */}
        <motion.circle
          cx="250" cy="30" r="5"
          fill="rgba(0,255,136,0.95)"
          style={{ filter: "drop-shadow(0 0 10px rgba(0,255,136,1))" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.85, duration: 0.45, type: "spring", stiffness: 300, damping: 14 }}
        />
        {/* Score callout */}
        <motion.text
          x="254" y="26" fill="rgba(0,255,136,0.9)"
          fontSize="9" fontFamily="IBM Plex Mono, monospace" fontWeight="700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.1 }}
        >
          +847 PTS
        </motion.text>
      </svg>
      {/* PnL bar */}
      <div style={{ marginTop: 12, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "78%" }}
          transition={{ delay: 0.6, duration: 1.4, ease: [0.16,1,.3,1] }}
          style={{ height: "100%", background: "linear-gradient(90deg,#00ff88,rgba(0,255,136,0.4))", borderRadius: 2, boxShadow: "0 0 8px rgba(0,255,136,0.5)" }}
        />
      </div>
    </div>
  );
}

function EarnIllustration() {
  const BURST = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const dist  = 75 + (i % 3) * 18;
    const colors = ["#ff6b00", "#00ff88", "#a855f7", "#ff6b00"];
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, color: colors[i % 4] };
  });

  return (
    <div style={{ position: "relative", width: 260, height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Burst particles */}
      {BURST.map((b, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{
            x: [0, b.x * 1.2, b.x],
            y: [0, b.y * 1.2, b.y],
            opacity: [0, 1, 0.7],
            scale:   [0, 1.1, 0.8],
          }}
          transition={{
            delay: 0.4 + i * 0.035,
            duration: 1.0,
            ease: "easeOut",
            repeat: Infinity,
            repeatDelay: 3,
          }}
          style={{
            position: "absolute",
            width: 5 + (i % 3) * 2,
            height: 5 + (i % 3) * 2,
            borderRadius: "50%",
            background: b.color,
            boxShadow: `0 0 8px ${b.color}`,
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
          }}
        />
      ))}
      {/* Center orb */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, delay: 0.15 }}
        style={{
          width: 72, height: 72,
          borderRadius: "50%",
          background: "radial-gradient(circle at 38% 38%, rgba(255,107,0,0.6), rgba(255,107,0,0.1))",
          border: "1.5px solid rgba(255,107,0,0.8)",
          boxShadow: "0 0 50px rgba(255,107,0,0.45), inset 0 0 20px rgba(255,107,0,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26,
          zIndex: 2,
        }}
      >
        ◈
      </motion.div>
      {/* Prize text */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85 }}
        style={{
          position: "absolute",
          bottom: 10,
          fontSize: 11,
          fontWeight: 700,
          color: "#00ff88",
          letterSpacing: "0.08em",
          textShadow: "0 0 12px rgba(0,255,136,0.7)",
        }}
      >
        $5,000 PRIZE POOL
      </motion.div>
    </div>
  );
}

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  {
    num:   "01",
    label: "FORM",
    title: "Assemble Your Squad",
    body:  "Recruit up to 4 traders. Every wallet feeds the collective score. Coordination is your edge.",
    accent: "#ff6b00",
    Illustration: FormIllustration,
  },
  {
    num:   "02",
    label: "COMPETE",
    title: "Trade. Score. Dominate.",
    body:  "Skill-based PnL scoring. No whale advantage. Position sizing is normalized — pure alpha wins.",
    accent: "#00ff88",
    Illustration: CompeteIllustration,
  },
  {
    num:   "03",
    label: "EARN",
    title: "Claim the Prize Pool",
    body:  "Top squads split $5,000. Spectators earn by predicting winners before the round ends.",
    accent: "#a855f7",
    Illustration: EarnIllustration,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SquadFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  // Each step gets ~100vh of scroll; animation completes at 0.67 progress
  // leaving the final ~100vh as a comfortable dwell on Step 3.
  const trackX = useTransform(scrollYProgress, [0, 0.67], ["0%", "-66.666%"]);
  const pct    = useTransform(scrollYProgress, [0, 0.67], ["0%", "100%"]);

  return (
    <section ref={containerRef} style={{ height: "400vh", position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>

        {/* Progress bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 1, background: "rgba(255,255,255,0.06)", zIndex: 10,
        }}>
          <motion.div style={{
            height: "100%",
            background: "linear-gradient(90deg,#ff6b00,#a855f7)",
            width: pct,
          }} />
        </div>

        {/* Step counter (top-right) */}
        <div style={{
          position: "absolute", top: 28, right: 32, zIndex: 10,
          fontSize: 9, letterSpacing: "0.14em", color: "rgba(90,97,112,0.7)",
          display: "flex", gap: 8, alignItems: "center",
        }}>
          {STEPS.map((s, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <span style={{ opacity: 0.3 }}>·</span>}
              {s.num}
            </span>
          ))}
        </div>

        {/* Sliding track */}
        <motion.div style={{
          display: "flex",
          width: "300vw",
          height: "100vh",
          x: trackX,
        }}>
          {STEPS.map((step, i) => (
            <div
              key={i}
              style={{
                width: "100vw",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 clamp(24px, 8vw, 120px)",
                position: "relative",
                overflow: "hidden",
                gap: "clamp(40px, 8vw, 120px)",
                flexWrap: "wrap",
              }}
            >
              {/* Background number ghost */}
              <div style={{
                position: "absolute",
                bottom: "-0.05em",
                right: "clamp(-20px, -2vw, -40px)",
                fontSize: "clamp(200px, 28vw, 380px)",
                fontWeight: 800,
                color: step.accent,
                opacity: 0.025,
                lineHeight: 1,
                pointerEvents: "none",
                userSelect: "none",
                letterSpacing: "-0.04em",
              }}>
                {step.num}
              </div>

              {/* Left: text */}
              <div style={{ maxWidth: 440, flex: "1 1 280px" }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  color: step.accent,
                  marginBottom: 20,
                  padding: "4px 10px",
                  border: `1px solid ${step.accent}33`,
                  borderRadius: 2,
                }}>
                  <span style={{
                    width: 5, height: 5,
                    borderRadius: "50%",
                    background: step.accent,
                    boxShadow: `0 0 6px ${step.accent}`,
                    display: "inline-block",
                  }} />
                  STEP {step.num} · {step.label}
                </div>

                <h2 style={{
                  fontSize: "clamp(28px, 3.8vw, 52px)",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: "-0.025em",
                  marginBottom: 20,
                  color: "var(--text)",
                }}>
                  {step.title}
                </h2>

                <p style={{
                  fontSize: "clamp(12px, 1.2vw, 14px)",
                  color: "var(--text-dim)",
                  lineHeight: 1.85,
                  maxWidth: 360,
                }}>
                  {step.body}
                </p>

                {/* Accent line */}
                <div style={{
                  marginTop: 28,
                  height: 1,
                  width: 48,
                  background: step.accent,
                  boxShadow: `0 0 8px ${step.accent}`,
                }} />
              </div>

              {/* Right: illustration */}
              <div style={{
                flex: "0 0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "clamp(240px, 35vw, 420px)",
              }}>
                <step.Illustration />
              </div>
            </div>
          ))}
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          style={{
            position: "absolute",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 9,
            letterSpacing: "0.14em",
            color: "rgba(90,97,112,0.5)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ fontSize: 12 }}
          >
            ↓
          </motion.div>
          SCROLL TO ADVANCE
        </motion.div>
      </div>
    </section>
  );
}
