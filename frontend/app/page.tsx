"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useInView } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

import MagneticButton    from "@/components/landing/MagneticButton";
import AnimatedLeaderboard from "@/components/landing/AnimatedLeaderboard";
import SquadFlow          from "@/components/landing/SquadFlow";
import {
  MOCK_SQUADS,
  MOCK_COMPETITION,
  formatUSDC,
} from "@/lib/mock-data";

const HeroCanvas = dynamic(() => import("@/components/landing/HeroCanvas"), { ssr: false });

// ── Cursor ────────────────────────────────────────────────────────────────────

function CustomCursor() {
  const cx = useMotionValue(-80);
  const cy = useMotionValue(-80);
  const tx = useMotionValue(-80);
  const ty = useMotionValue(-80);
  const scx = useSpring(cx, { stiffness: 520, damping: 48 });
  const scy = useSpring(cy, { stiffness: 520, damping: 48 });
  const stx = useSpring(tx, { stiffness: 110, damping: 16 });
  const sty = useSpring(ty, { stiffness: 110, damping: 16 });

  useEffect(() => {
    const m = (e: MouseEvent) => {
      cx.set(e.clientX - 9);
      cy.set(e.clientY - 9);
      tx.set(e.clientX - 18);
      ty.set(e.clientY - 18);
    };
    window.addEventListener("mousemove", m);
    return () => window.removeEventListener("mousemove", m);
  }, [cx, cy, tx, ty]);

  return (
    <>
      <motion.div style={{
        position: "fixed", left: 0, top: 0, zIndex: 9998,
        x: stx, y: sty,
        width: 36, height: 36,
        borderRadius: "50%",
        border: "1px solid rgba(249,115,22,0.22)",
        pointerEvents: "none",
        mixBlendMode: "screen",
      }} />
      <motion.div style={{
        position: "fixed", left: 0, top: 0, zIndex: 9999,
        x: scx, y: scy,
        width: 18, height: 18,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,107,0,0.9) 0%, rgba(255,107,0,0.3) 60%, transparent 100%)",
        boxShadow: "0 0 14px rgba(255,107,0,0.7), 0 0 40px rgba(255,107,0,0.2)",
        pointerEvents: "none",
        mixBlendMode: "screen",
      }} />
    </>
  );
}

// ── SSR-safe countdown ────────────────────────────────────────────────────────

function useCountdown(endTime: number) {
  const [rem, setRem] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setRem(Math.max(0, Math.floor(endTime) - Math.floor(Date.now() / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  if (rem === null) return "--:--:--";
  const h = Math.floor(rem / 3600).toString().padStart(2, "0");
  const m = Math.floor((rem % 3600) / 60).toString().padStart(2, "0");
  const s = (rem % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// ── Word reveal ───────────────────────────────────────────────────────────────

function WordReveal({
  text, delay = 0, accent = false, style = {},
}: {
  text: string; delay?: number; accent?: boolean; style?: React.CSSProperties;
}) {
  const words = text.split(" ");
  return (
    <motion.span
      style={{ display: "inline-flex", flexWrap: "wrap", gap: "0.22em", ...style }}
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.075, delayChildren: delay } } }}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          variants={{
            hidden:  { opacity: 0, y: 36, filter: "blur(14px)" },
            visible: { opacity: 1, y: 0,  filter: "blur(0px)", transition: { duration: 0.78, ease: [0.22, 0.6, 0.36, 1] } },
          }}
          style={{ color: accent ? "#ff6b00" : "inherit", display: "inline-block" }}
        >
          {w}
        </motion.span>
      ))}
    </motion.span>
  );
}

// ── Live ticker ───────────────────────────────────────────────────────────────

const FEED = [
  { wallet: "9xKq…4mRz", squad: "Liquidation Hunters",  pnl: +4.21, asset: "SOL-PERP" },
  { wallet: "7wPn…8kLm", squad: "Basis Basis Basis",    pnl: +2.64, asset: "ETH-PERP" },
  { wallet: "4kFt…3gCe", squad: "Vol Arb Gang",         pnl: -1.83, asset: "BTC-PERP" },
  { wallet: "5yVi…1fKr", squad: "Alpha Extractors",     pnl: +8.47, asset: "SOL-PERP" },
  { wallet: "2vOw…9bGn", squad: "Delta Neutral",        pnl: -0.92, asset: "JTO-PERP" },
  { wallet: "1wQd…7aFm", squad: "Perp Punishers",       pnl: +3.14, asset: "WIF-PERP" },
  { wallet: "6rMs…0dBh", squad: "The Long Game",        pnl: +1.78, asset: "BNB-PERP" },
  { wallet: "3xTg…5dIp", squad: "Solana Sharpshooters", pnl: -2.31, asset: "SOL-PERP" },
];
const DOUBLED = [...FEED, ...FEED];

// ── Glow card (3-D tilt) ──────────────────────────────────────────────────────

function GlowCard({
  children, accent = "rgba(255,107,0,0.25)",
}: { children: React.ReactNode; accent?: string }) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20 });
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r  = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top)  / r.height;
    rx.set((py - 0.5) * -14);
    ry.set((px - 0.5) *  14);
    glowX.set(px * 100);
    glowY.set(py * 100);
  }
  function onLeave() { rx.set(0); ry.set(0); }

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX: srx,
        rotateY: sry,
        transformPerspective: 800,
        transformStyle: "preserve-3d",
        position: "relative",
        overflow: "hidden",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.07)",
        background: "var(--surface-raised)",
        cursor: "none",
      }}
      whileHover={{
        borderColor: "rgba(255,255,255,0.14)",
        boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)`,
      }}
    >
      {/* Spotlight follow */}
      <motion.div
        style={{
          position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
          background: `radial-gradient(circle at ${glowX}% ${glowY}%, ${accent}, transparent 65%)`,
          opacity: 0,
        }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </motion.div>
  );
}

// ── Chaos numbers (left split-panel) ─────────────────────────────────────────

function ChaosPanel() {
  const [nums, setNums] = useState<string[]>([]);
  useEffect(() => {
    const gen = () => Array.from({ length: 18 }, () => (Math.random() * 10000 - 5000).toFixed(2));
    setNums(gen());
    const id = setInterval(() => setNums(gen()), 120);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "8px 12px",
      padding: "24px",
      fontFamily: "var(--font-mono)",
      userSelect: "none",
    }}>
      {nums.map((n, i) => {
        const pos = parseFloat(n) >= 0;
        return (
          <motion.span
            key={i}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 0.1, ease: "linear" }}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: pos ? "rgba(255,68,68,0.7)" : "rgba(255,68,68,0.5)",
              letterSpacing: "0.04em",
            }}
          >
            {pos ? "+" : ""}{n}
          </motion.span>
        );
      })}
    </div>
  );
}

// ── Section reveal wrapper ────────────────────────────────────────────────────

function Reveal({ children, delay = 0, style = {} }: {
  children: React.ReactNode; delay?: number; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inV = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inV ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 0.6, 0.36, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const countdown    = useCountdown(MOCK_COMPETITION.endTime);
  const prizeDisplay = formatUSDC(MOCK_COMPETITION.totalPrize);

  // Lenis smooth scroll
  useEffect(() => {
    let lenisInstance: { raf: (t: number) => void; destroy: () => void } | null = null;
    let rafId = 0;
    import("lenis").then(({ default: Lenis }) => {
      lenisInstance = new (Lenis as new (opts: object) => { raf: (t: number) => void; destroy: () => void })({
        duration: 1.35,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      function loop(t: number) {
        lenisInstance!.raf(t);
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(rafId);
      lenisInstance?.destroy();
    };
  }, []);

  return (
    <div style={{ background: "var(--bg)", overflowX: "hidden", cursor: "none" }}>
      <CustomCursor />

      {/* ════════════════════════════════════════════════════════
          1 · HERO
      ════════════════════════════════════════════════════════ */}
      <section style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}>
        <HeroCanvas />

        {/* Gradient vignette: edges + bottom fade */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2,
          background: `
            radial-gradient(ellipse 60% 50% at 50% 50%, transparent 40%, rgba(10,11,13,0.7) 100%),
            linear-gradient(to bottom, transparent 60%, rgba(10,11,13,0.95) 100%)
          `,
        }} />

        {/* ── Navbar ── */}
        <nav style={{
          position: "relative", zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px clamp(20px, 5vw, 52px)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}>
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 6,
              background: "linear-gradient(135deg,#ff6b00,#f97316)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 0 20px rgba(255,107,0,0.35)",
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2C8 2 4 5.5 4 9.5C4 11.98 5.79 14 8 14C10.21 14 12 11.98 12 9.5C12 5.5 8 2 8 2Z" fill="white" opacity=".9"/>
                <path d="M8 7C8 7 6 8.8 6 10.5C6 11.33 6.9 12 8 12C9.1 12 10 11.33 10 10.5C10 8.8 8 7 8 7Z" fill="rgba(0,0,0,0.3)"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", lineHeight: 1 }}>ADRENA</div>
              <div style={{ fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.2em", lineHeight: 1.6 }}>SQUADS</div>
            </div>
          </motion.div>

          {/* Nav right */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            style={{ display: "flex", alignItems: "center", gap: 20 }}
          >
            <span style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 9, letterSpacing: "0.12em", color: "var(--success)",
            }}>
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "var(--success)", display: "inline-block",
                }}
              />
              ROUND {MOCK_COMPETITION.roundNumber} LIVE
            </span>
            <Link href="/squads" style={{
              padding: "8px 18px", borderRadius: 3,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text)", fontSize: 10,
              fontWeight: 600, textDecoration: "none",
              letterSpacing: "0.08em",
              backdropFilter: "blur(8px)",
            }}>
              ENTER APP →
            </Link>
          </motion.div>
        </nav>

        {/* ── Hero body ── */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "48px clamp(20px, 6vw, 80px) 120px",
          position: "relative",
          zIndex: 10,
        }}>
          {/* Season pill */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 9, letterSpacing: "0.18em", color: "var(--text-muted)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 2, padding: "5px 14px", marginBottom: 40,
              backdropFilter: "blur(8px)",
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff6b00", display: "inline-block" }}
            />
            SEASON {MOCK_COMPETITION.seasonId} · ROUND {MOCK_COMPETITION.roundNumber} OF 8 · SOLANA DEVNET
          </motion.div>

          {/* Headline */}
          <h1 style={{
            fontSize: "clamp(48px, 9.5vw, 108px)",
            fontWeight: 700,
            lineHeight: 0.96,
            letterSpacing: "-0.03em",
            marginBottom: 28,
            display: "flex",
            flexDirection: "column",
            gap: "0.08em",
            alignItems: "center",
          }}>
            <WordReveal text="Trade Together." delay={0.1} />
            <WordReveal text="Win Together." delay={0.32} accent />
          </h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.72 }}
            style={{
              fontSize: "clamp(12px, 1.35vw, 14px)",
              color: "var(--text-dim)",
              maxWidth: 500,
              lineHeight: 1.88,
              marginBottom: 44,
            }}
          >
            The first team-based trading competition on Solana.
            Form a squad, compete on skill-based PnL, and earn rewards —
            or predict the winners from the sidelines.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 56 }}
          >
            <MagneticButton href="/squads" variant="primary">
              ENTER COMPETITION →
            </MagneticButton>
            <MagneticButton href="/predict" variant="ghost">
              PREDICT WINNERS
            </MagneticButton>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.05 }}
            style={{
              display: "flex",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 6,
              overflow: "hidden",
              backdropFilter: "blur(12px)",
              background: "rgba(255,255,255,0.03)",
              width: "min(520px, 100%)",
            }}
          >
            {[
              { label: "ACTIVE SQUADS", value: `${MOCK_SQUADS.length}`,  accent: false },
              { label: "PRIZE POOL",    value: prizeDisplay,              accent: false },
              { label: "ROUND ENDS IN", value: countdown,                 accent: true  },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1,
                padding: "14px 16px",
                textAlign: "center",
                borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}>
                <div style={{
                  fontSize: 9, letterSpacing: "0.12em",
                  color: "var(--text-muted)", marginBottom: 5,
                }}>
                  {s.label}
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 700,
                  letterSpacing: s.accent ? "0.04em" : "0.01em",
                  color: s.accent ? "#ff6b00" : "var(--text)",
                  textShadow: s.accent ? "0 0 20px rgba(255,107,0,0.5)" : "none",
                }}>
                  {s.value}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Live ticker ── */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
          overflow: "hidden",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          backdropFilter: "blur(10px)",
          background: "rgba(10,11,13,0.6)",
          height: 36,
          display: "flex",
          alignItems: "center",
        }}>
          <div style={{
            display: "flex",
            animation: "marquee 55s linear infinite",
            gap: 0,
            whiteSpace: "nowrap",
          }}>
            {DOUBLED.map((t, i) => (
              <span key={i} style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "0 28px",
                fontSize: 9,
                letterSpacing: "0.08em",
                borderRight: "1px solid rgba(255,255,255,0.04)",
                color: "var(--text-muted)",
              }}>
                <span style={{ color: "rgba(90,97,112,0.6)" }}>{t.wallet}</span>
                <span style={{ color: "var(--text-dim)" }}>{t.squad}</span>
                <span style={{ fontWeight: 600 }}>·</span>
                <span style={{ color: "rgba(90,97,112,0.6)" }}>{t.asset}</span>
                <span style={{
                  fontWeight: 700,
                  color: t.pnl >= 0 ? "#00ff88" : "#ff4444",
                  textShadow: `0 0 8px ${t.pnl >= 0 ? "rgba(0,255,136,0.5)" : "rgba(255,68,68,0.5)"}`,
                }}>
                  {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}%
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          2 · HOW IT WORKS  (horizontal scroll)
      ════════════════════════════════════════════════════════ */}
      <div style={{ background: "var(--bg)" }}>
        <Reveal style={{ textAlign: "center", padding: "80px 24px 32px" }}>
          <div style={{
            fontSize: 9, letterSpacing: "0.22em",
            color: "rgba(90,97,112,0.7)", marginBottom: 14,
          }}>
            THE MECHANICS
          </div>
          <h2 style={{
            fontSize: "clamp(22px, 3vw, 36px)",
            fontWeight: 700, letterSpacing: "-0.02em",
            marginBottom: 8,
          }}>
            How It Works
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
            Scroll through each step ↓
          </p>
        </Reveal>
        <SquadFlow />
      </div>

      {/* ════════════════════════════════════════════════════════
          3 · LIVE LEADERBOARD
      ════════════════════════════════════════════════════════ */}
      <section style={{
        background: "var(--bg)",
        padding: "100px clamp(20px, 6vw, 80px)",
        position: "relative",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: "30%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(700px, 80vw)", height: "min(700px, 80vw)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,153,58,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <Reveal>
            <div style={{
              display: "flex", alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 32, flexWrap: "wrap", gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(90,97,112,0.7)", marginBottom: 10 }}>
                  SEASON {MOCK_COMPETITION.seasonId} · ROUND {MOCK_COMPETITION.roundNumber}
                </div>
                <h2 style={{
                  fontSize: "clamp(22px, 3vw, 38px)",
                  fontWeight: 700, letterSpacing: "-0.02em",
                }}>
                  Live Leaderboard
                </h2>
              </div>
              <Link href="/squads" style={{
                fontSize: 10, letterSpacing: "0.08em",
                color: "#ff6b00", textDecoration: "none",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                VIEW ALL SQUADS →
              </Link>
            </div>
          </Reveal>

          {/* Table header */}
          <Reveal delay={0.1}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "6px 20px 12px",
              fontSize: 8, letterSpacing: "0.16em",
              color: "rgba(90,97,112,0.6)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <span style={{ minWidth: 30 }}>RK</span>
              <span style={{ minWidth: 12 }}>  </span>
              <span style={{ flex: 1 }}>SQUAD</span>
              <span style={{ minWidth: 56, textAlign: "right" }}>SCORE</span>
              <span style={{ minWidth: 58, textAlign: "right" }}>PRIZE</span>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div style={{
              background: "var(--surface)",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}>
              <AnimatedLeaderboard />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          4 · NOT GAMBLING — SPLIT SCREEN
      ════════════════════════════════════════════════════════ */}
      <section style={{
        background: "var(--bg)",
        padding: "100px clamp(20px, 6vw, 80px)",
      }}>
        <Reveal style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(90,97,112,0.7)", marginBottom: 14 }}>
            THE DIFFERENCE
          </div>
          <h2 style={{ fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 700, letterSpacing: "-0.02em" }}>
            This isn&apos;t gambling.
          </h2>
        </Reveal>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 2,
          maxWidth: 880,
          margin: "0 auto",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {/* Left: Chaos */}
          <Reveal delay={0}>
            <div style={{
              background: "linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(10,11,13,0) 60%)",
              padding: "36px",
              position: "relative",
              borderRight: "1px solid rgba(255,255,255,0.04)",
              minHeight: 360,
              display: "flex",
              flexDirection: "column",
            }}>
              <div style={{
                fontSize: 9, letterSpacing: "0.2em",
                color: "rgba(239,68,68,0.6)", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#ef4444",
                  boxShadow: "0 0 6px rgba(239,68,68,0.8)",
                  display: "inline-block",
                }} />
                GAMBLING
              </div>
              <p style={{
                fontSize: 11, fontWeight: 600,
                color: "rgba(239,68,68,0.7)",
                lineHeight: 1.6, marginBottom: 20,
              }}>
                Pure luck.<br />No edge. No system.
              </p>
              <div style={{ flex: 1, opacity: 0.7 }}>
                <ChaosPanel />
              </div>
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
                background: "linear-gradient(to top, rgba(10,11,13,0.8), transparent)",
                pointerEvents: "none",
              }} />
            </div>
          </Reveal>

          {/* Right: Skill */}
          <Reveal delay={0.12}>
            <div style={{
              background: "linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(10,11,13,0) 60%)",
              padding: "36px",
              minHeight: 360,
              display: "flex",
              flexDirection: "column",
            }}>
              <div style={{
                fontSize: 9, letterSpacing: "0.2em",
                color: "rgba(34,197,94,0.7)", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 6px rgba(34,197,94,0.8)",
                  display: "inline-block",
                }} />
                SKILL-BASED TRADING
              </div>
              <p style={{
                fontSize: 11, fontWeight: 600,
                color: "rgba(34,197,94,0.8)",
                lineHeight: 1.6, marginBottom: 24,
              }}>
                Systematic edge.<br />Team strategy wins.
              </p>

              {/* Feature rows */}
              {[
                ["Normalized position sizing", "No whale advantage"],
                ["PnL-based scoring",           "Pure alpha, no size"],
                ["Squad coordination",          "Team dynamic edge"],
                ["On-chain verification",       "Trustless + transparent"],
              ].map(([feat, note], i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 + 0.2, duration: 0.5 }}
                  style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: "#22c55e",
                      boxShadow: "0 0 4px rgba(34,197,94,0.8)",
                      display: "inline-block", flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 11, color: "var(--text)", fontWeight: 500 }}>
                      {feat}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 9, color: "rgba(34,197,94,0.6)",
                    letterSpacing: "0.06em", textAlign: "right", whiteSpace: "nowrap",
                  }}>
                    {note}
                  </span>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          5 · FEATURE CARDS
      ════════════════════════════════════════════════════════ */}
      <section style={{
        background: "var(--bg)",
        padding: "80px clamp(20px, 6vw, 80px) 100px",
      }}>
        <Reveal style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(90,97,112,0.7)", marginBottom: 14 }}>
            PROTOCOL FEATURES
          </div>
          <h2 style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Built Different
          </h2>
        </Reveal>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
          maxWidth: 960,
          margin: "0 auto",
        }}>
          {[
            {
              icon: "⚔️",
              title: "Team Competition",
              body: "First squad-based trading protocol on Solana. Coordination is your moat.",
              accent: "rgba(255,107,0,0.2)",
            },
            {
              icon: "⚖️",
              title: "Skill-Based Scoring",
              body: "Position sizing normalized. No whale advantage. Pure alpha wins rounds.",
              accent: "rgba(0,255,136,0.15)",
            },
            {
              icon: "👁️",
              title: "Spectator Predictions",
              body: "Watch and earn. Predict winning squads before rounds close.",
              accent: "rgba(168,85,247,0.18)",
            },
            {
              icon: "🔗",
              title: "On-Chain Execution",
              body: "Fully verifiable. Trustless scoring via Adrena Protocol positions.",
              accent: "rgba(99,179,237,0.15)",
            },
          ].map((f, i) => (
            <Reveal key={i} delay={i * 0.07}>
              <GlowCard accent={f.accent}>
                <div style={{ padding: "28px 24px" }}>
                  <div style={{ fontSize: 28, marginBottom: 16, lineHeight: 1 }}>{f.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>
                    {f.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.75 }}>
                    {f.body}
                  </div>
                </div>
              </GlowCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          6 · FOOTER CTA
      ════════════════════════════════════════════════════════ */}
      <section style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--bg)",
        padding: "120px clamp(20px, 6vw, 80px) 80px",
        textAlign: "center",
      }}>
        {/* Orange bloom */}
        <div style={{
          position: "absolute", top: "20%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(900px, 120vw)", height: "min(600px, 80vw)",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(255,107,0,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <Reveal>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(90,97,112,0.7)", marginBottom: 20 }}>
            ROUND {MOCK_COMPETITION.roundNumber} IS LIVE
          </div>
          <h2 style={{
            fontSize: "clamp(32px, 5.5vw, 70px)",
            fontWeight: 700,
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            marginBottom: 16,
          }}>
            <WordReveal text="Ready to" delay={0} />
            <br />
            <WordReveal text="Compete?" delay={0.18} accent />
          </h2>

          <p style={{
            fontSize: "clamp(11px, 1.2vw, 13px)",
            color: "var(--text-dim)",
            maxWidth: 400,
            margin: "0 auto 16px",
            lineHeight: 1.8,
          }}>
            Round ends in{" "}
            <span style={{ color: "#ff6b00", fontWeight: 700, textShadow: "0 0 12px rgba(255,107,0,0.5)" }}>
              {countdown}
            </span>
          </p>

          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 44 }}>
            Prize pool: <span style={{ color: "#00ff88", fontWeight: 700 }}>{prizeDisplay}</span>
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <MagneticButton href="/squads" variant="primary">
              FORM A SQUAD →
            </MagneticButton>
            <MagneticButton href="/predict" variant="ghost">
              PREDICT WINNERS
            </MagneticButton>
          </div>
        </Reveal>

        {/* Footer links */}
        <Reveal delay={0.2}>
          <div style={{
            marginTop: 80,
            paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(16px, 3vw, 36px)",
            flexWrap: "wrap",
          }}>
            {[
              ["/squads",  "Squads"],
              ["/predict", "Predict"],
              ["/profile", "Profile"],
            ].map(([href, label]) => (
              <Link key={href} href={href} style={{
                fontSize: 9, letterSpacing: "0.14em",
                color: "rgba(90,97,112,0.6)", textDecoration: "none",
              }}>
                {label.toUpperCase()}
              </Link>
            ))}
            <span style={{ fontSize: 9, color: "rgba(90,97,112,0.3)", letterSpacing: "0.08em" }}>
              ADRENA SQUADS © 2025
            </span>
            <span style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 9, color: "rgba(90,97,112,0.5)", letterSpacing: "0.1em",
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: "#f59e0b", display: "inline-block",
              }} />
              DEVNET
            </span>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
