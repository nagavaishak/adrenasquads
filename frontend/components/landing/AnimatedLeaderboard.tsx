"use client";
import { useRef, useState, useEffect } from "react";
import { motion, useInView, animate } from "framer-motion";
import { MOCK_SQUADS, formatUSDC } from "@/lib/mock-data";

// ── Counting number ───────────────────────────────────────────────────────────

function Counter({ to, inView, suffix = "" }: { to: number; inView: boolean; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const ctrl = animate(0, to, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => ctrl.stop();
  }, [to, inView]);
  return <>{(val / 100).toFixed(2)}{suffix}</>;
}

// ── Rank badge ────────────────────────────────────────────────────────────────

function Badge({ rank }: { rank: number }) {
  const isGold = rank === 1;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 30,
      height: 20,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.05em",
      borderRadius: 2,
      flexShrink: 0,
      color:   isGold ? "#c9993a" : "rgba(90,97,112,0.9)",
      border: `1px solid ${isGold ? "rgba(201,153,58,0.4)" : "rgba(255,255,255,0.07)"}`,
      background: isGold ? "rgba(201,153,58,0.06)" : "transparent",
    }}>
      {String(rank).padStart(2, "0")}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AnimatedLeaderboard() {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const maxScore = MOCK_SQUADS[0].aggregateScore;
  const rows     = MOCK_SQUADS.slice(0, 6);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {rows.map((squad, i) => {
        const isFirst = i === 0;
        const pct     = (squad.aggregateScore / maxScore) * 100;
        const prize   = formatUSDC(squad.prizeAmount);
        const up      = squad.rank < squad.prevRank;
        const dn      = squad.rank > squad.prevRank;
        const bar     = isFirst
          ? "linear-gradient(90deg,#c9993a,rgba(201,153,58,0.5))"
          : i < 3
          ? "linear-gradient(90deg,#ff6b00,rgba(249,115,22,0.35))"
          : "linear-gradient(90deg,rgba(255,255,255,0.25),rgba(255,255,255,0.08))";
        const barGlow = isFirst
          ? "0 0 14px rgba(201,153,58,0.5)"
          : i < 3
          ? "0 0 10px rgba(255,107,0,0.35)"
          : "none";

        return (
          <motion.div
            key={squad.pubkey ?? i}
            initial={{ opacity: 0, x: -28 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.55, delay: i * 0.07, ease: [0.25, 0.4, 0.25, 1] }}
            whileHover={{ backgroundColor: "rgba(255,255,255,0.025)" }}
            style={{
              position: "relative",
              padding: "14px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              transition: "background 0.15s",
              borderRadius: 2,
            }}
          >
            {/* Row header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 9 }}>
              <Badge rank={squad.rank} />

              {/* Trend */}
              <span style={{ fontSize: 9, width: 12, flexShrink: 0 }}>
                {up && <span style={{ color: "#00ff88" }}>▲</span>}
                {dn && <span style={{ color: "#ff4444" }}>▼</span>}
                {!up && !dn && <span style={{ color: "rgba(90,97,112,0.7)" }}>—</span>}
              </span>

              {/* Name */}
              <span style={{
                flex: 1,
                fontSize: 11,
                fontWeight: isFirst ? 700 : 500,
                letterSpacing: "0.03em",
                color: isFirst ? "#c9993a" : "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {squad.name}
              </span>

              {/* Score */}
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: isFirst ? "#c9993a" : "#ff6b00",
                letterSpacing: "0.04em",
                minWidth: 56,
                textAlign: "right",
              }}>
                <Counter to={squad.aggregateScore} inView={inView} suffix="%" />
              </span>

              {/* Prize */}
              <span style={{
                fontSize: 10,
                color: "#00ff88",
                letterSpacing: "0.06em",
                minWidth: 58,
                textAlign: "right",
                opacity: 0.9,
              }}>
                {prize}
              </span>
            </div>

            {/* Racing bar */}
            <div style={{
              height: 2,
              background: "rgba(255,255,255,0.05)",
              borderRadius: 1,
              overflow: "hidden",
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={inView ? { width: `${pct}%` } : {}}
                transition={{ duration: 1.5, delay: i * 0.07 + 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: "100%",
                  borderRadius: 1,
                  background: bar,
                  boxShadow: barGlow,
                }}
              />
            </div>

            {/* Rank-1 pulse ring */}
            {isFirst && (
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 2,
                  border: "1px solid rgba(201,153,58,0.18)",
                  pointerEvents: "none",
                }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
