"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const STEPS = [
  {
    num: "01",
    label: "FORM",
    title: "Assemble Your Squad",
    body: "Recruit up to 4 traders. Every wallet feeds the collective score. Coordination is your edge.",
    accent: "#ff6b00",
    icon: "◎",
  },
  {
    num: "02",
    label: "COMPETE",
    title: "Trade. Score. Dominate.",
    body: "Skill-based PnL scoring. No whale advantage. Position sizing is normalized — pure alpha wins.",
    accent: "#00ff88",
    icon: "◈",
  },
  {
    num: "03",
    label: "EARN",
    title: "Claim the Prize Pool",
    body: "Top squads split $5,000. Spectators earn by predicting winners before the round ends.",
    accent: "#a855f7",
    icon: "◉",
  },
];

function StepCard({ step, index }: { step: typeof STEPS[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.25, 0.4, 0.25, 1] }}
      style={{
        flex: "1 1 280px",
        maxWidth: 360,
        padding: "36px 32px",
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${step.accent}22`,
        borderRadius: 8,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ghost number */}
      <div style={{
        position: "absolute",
        bottom: -16,
        right: 16,
        fontSize: 120,
        fontWeight: 800,
        color: step.accent,
        opacity: 0.04,
        lineHeight: 1,
        letterSpacing: "-0.04em",
        pointerEvents: "none",
        userSelect: "none",
      }}>
        {step.num}
      </div>

      {/* Icon */}
      <div style={{
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: `${step.accent}18`,
        border: `1.5px solid ${step.accent}55`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        color: step.accent,
        boxShadow: `0 0 20px ${step.accent}30`,
        marginBottom: 24,
      }}>
        {step.icon}
      </div>

      {/* Label */}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 9,
        letterSpacing: "0.18em",
        color: step.accent,
        marginBottom: 14,
        padding: "3px 8px",
        border: `1px solid ${step.accent}33`,
        borderRadius: 2,
      }}>
        <span style={{
          width: 4, height: 4, borderRadius: "50%",
          background: step.accent, display: "inline-block",
        }} />
        STEP {step.num} · {step.label}
      </div>

      <h3 style={{
        fontSize: "clamp(20px, 2vw, 26px)",
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1.2,
        marginBottom: 12,
        color: "var(--text)",
      }}>
        {step.title}
      </h3>

      <p style={{
        fontSize: 13,
        color: "var(--text-dim)",
        lineHeight: 1.8,
      }}>
        {step.body}
      </p>

      {/* Bottom accent */}
      <div style={{
        marginTop: 28,
        height: 1,
        width: 40,
        background: step.accent,
        boxShadow: `0 0 8px ${step.accent}`,
      }} />
    </motion.div>
  );
}

export default function SquadFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section style={{ padding: "120px clamp(24px, 8vw, 120px)" }}>
      {/* Header */}
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: 64, maxWidth: 480 }}
      >
        <div style={{
          fontSize: 9, letterSpacing: "0.18em", color: "#ff6b00",
          marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 20, height: 1, background: "#ff6b00", display: "inline-block" }} />
          HOW IT WORKS
        </div>
        <h2 style={{
          fontSize: "clamp(28px, 4vw, 48px)",
          fontWeight: 700,
          letterSpacing: "-0.025em",
          lineHeight: 1.1,
          color: "var(--text)",
        }}>
          Three steps.<br />One leaderboard.
        </h2>
      </motion.div>

      {/* Cards */}
      <div style={{
        display: "flex",
        gap: 24,
        flexWrap: "wrap",
      }}>
        {STEPS.map((step, i) => (
          <StepCard key={step.num} step={step} index={i} />
        ))}
      </div>
    </section>
  );
}
