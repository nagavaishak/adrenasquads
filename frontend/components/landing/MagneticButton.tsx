"use client";
import { useRef, ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";

interface Props {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
}

export default function MagneticButton({ href, children, variant = "primary" }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 18, mass: 0.8 });
  const sy = useSpring(y, { stiffness: 180, damping: 18, mass: 0.8 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r  = wrapRef.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width  / 2);
    const dy = e.clientY - (r.top  + r.height / 2);
    x.set(dx * 0.38);
    y.set(dy * 0.38);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  const isPrimary = variant === "primary";

  return (
    <motion.div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ display: "inline-block", x: sx, y: sy, cursor: "none" }}
    >
      <motion.div
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        style={{ position: "relative", overflow: "hidden", borderRadius: 4 }}
      >
        {/* Shimmer sweep on hover */}
        <motion.div
          initial={{ x: "-110%", skewX: -20 }}
          whileHover={{ x: "110%" }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
        <Link
          href={href}
          style={{
            position: "relative",
            zIndex: 2,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: isPrimary ? "15px 40px" : "14px 36px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textDecoration: "none",
            whiteSpace: "nowrap",
            ...(isPrimary ? {
              background: "linear-gradient(135deg, #ff6b00 0%, #f97316 60%, #fb923c 100%)",
              color: "#000",
              boxShadow: "0 0 0 1px rgba(249,115,22,0.3), 0 0 40px rgba(249,115,22,0.25), 0 4px 16px rgba(0,0,0,0.4)",
            } : {
              background: "rgba(255,255,255,0.04)",
              color: "rgba(232,233,236,0.85)",
              border: "1px solid rgba(232,233,236,0.14)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }),
          }}
        >
          {children}
        </Link>
      </motion.div>
    </motion.div>
  );
}
