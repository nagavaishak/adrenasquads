"use client";
import { useEffect, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Line {
  pts: Float32Array;
  baseY: number;
  amp: number;
  nOff: number;
  nSpd: number;
  hue: number;
  alpha: number;
  lw: number;
}

interface Dot {
  x: number; y: number;
  vx: number; vy: number;
  r: number; a: number;
  decay: number; hue: number;
}

interface Label {
  x: number; y: number; vy: number;
  text: string; hue: number;
  a: number; life: number; max: number;
}

// ── Layered sine noise — realistic price action ───────────────────────────────

function noise(t: number, seed: number) {
  return (
    Math.sin(t * 0.7  + seed * 2.3) * 0.38 +
    Math.sin(t * 2.0  + seed * 0.9) * 0.24 +
    Math.sin(t * 5.1  + seed * 1.7) * 0.15 +
    Math.sin(t * 12.4 + seed * 3.2) * 0.10 +
    Math.sin(t * 28.7 + seed * 0.5) * 0.07 +
    Math.sin(t * 63.1 + seed * 2.1) * 0.04 +
    Math.sin(t * 127  + seed * 1.3) * 0.02
  );
}

// ── Floating labels ───────────────────────────────────────────────────────────

const LABEL_DATA: [string, number][] = [
  ["+$2,847", 140],
  ["+$634",   140],
  ["-$289",     0],
  ["+$4,571", 140],
  ["-$91",      0],
  ["+$1,203", 140],
  ["ALPHA EXTRACTORS",     25],
  ["LIQUIDATION HUNTERS",  25],
  ["DELTA NEUTRAL",       220],
  ["BASIS BASIS BASIS",    25],
  ["SOL-PERP",           270],
  ["BTC-PERP",            25],
  ["+$892",   140],
  ["-$447",     0],
  ["VOL ARB GANG",        200],
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HeroCanvas() {
  const cvs  = useRef<HTMLCanvasElement>(null);
  const raf  = useRef(0);
  const mouse = useRef({ x: -1000, y: -1000 });
  const S = useRef<{
    lines: Line[];
    dots: Dot[];
    labels: Label[];
    tick: number;
    nextLabel: number;
  }>({ lines: [], dots: [], labels: [], tick: 0, nextLabel: 80 });

  useEffect(() => {
    const c   = cvs.current!;
    const cx  = c.getContext("2d")!;
    const N   = 200; // points per line

    // ── Resize ──────────────────────────────────────────────────────────────
    const resize = () => {
      c.width  = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Mouse ────────────────────────────────────────────────────────────────
    const onMouse = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMouse);

    // ── Init chart lines (depth layers) ─────────────────────────────────────
    // 3 background (dim, slow), 3 mid, 1 foreground (bright, fast)
    const LINE_DEFS: [number, number, number, number, number][] = [
      // [hue, baseY, amp, speed, alpha, lw] — layer: bg
      [220, 0.20, 0.025, 0.0012, 0.08],
      [270, 0.38, 0.020, 0.0009, 0.07],
      [220, 0.72, 0.022, 0.0011, 0.09],
      // mid
      [25,  0.28, 0.055, 0.0028, 0.22],
      [140, 0.55, 0.048, 0.0032, 0.20],
      [25,  0.82, 0.052, 0.0025, 0.18],
      // foreground
      [25,  0.44, 0.090, 0.0065, 0.50],
    ];
    const LINE_WIDTHS = [0.4, 0.35, 0.4, 0.9, 0.85, 0.9, 1.6];

    S.current.lines = LINE_DEFS.map(([hue, baseY, amp, nSpd, alpha], i) => {
      const seed = i * 1.731;
      const pts  = new Float32Array(N);
      for (let j = 0; j < N; j++) {
        pts[j] = baseY + noise(j * 0.018 + seed * 0.1, seed) * amp;
      }
      return { pts, baseY, amp, nOff: seed * 3.7, nSpd, hue, alpha, lw: LINE_WIDTHS[i] };
    });

    // ── Init particles ───────────────────────────────────────────────────────
    S.current.dots = Array.from({ length: 220 }, (_, idx) => ({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      vx:    (Math.random() - .5) * .14,
      vy:    -(0.22 + Math.random() * .42),
      r:     0.35 + Math.random() * 1.3,
      a:     Math.random(),
      decay: 0.0018 + Math.random() * 0.003,
      hue:   [25, 140, 0, 220][idx % 4],
    }));

    // ── Draw loop ────────────────────────────────────────────────────────────
    const draw = () => {
      const w = c.width, h = c.height;
      const { lines, dots, labels } = S.current;
      S.current.tick++;

      // Trail (motion blur)
      cx.fillStyle = "rgba(10,11,13,0.11)";
      cx.fillRect(0, 0, w, h);

      // Ambient center bloom
      const ag = cx.createRadialGradient(w * .5, h * .42, 0, w * .5, h * .42, w * .58);
      ag.addColorStop(0, "rgba(249,115,22,0.05)");
      ag.addColorStop(.55, "rgba(100,60,220,0.015)");
      ag.addColorStop(1, "transparent");
      cx.fillStyle = ag;
      cx.fillRect(0, 0, w, h);

      // Mouse glow (reactive)
      const { x: mx, y: my } = mouse.current;
      if (mx > 0) {
        const mg = cx.createRadialGradient(mx, my, 0, mx, my, 480);
        mg.addColorStop(0,   "rgba(255,107,0,0.08)");
        mg.addColorStop(.38, "rgba(255,107,0,0.025)");
        mg.addColorStop(1,   "transparent");
        cx.fillStyle = mg;
        cx.fillRect(0, 0, w, h);
      }

      // Chart lines
      for (let li = 0; li < lines.length; li++) {
        const l = lines[li];
        l.nOff += l.nSpd;
        const newY = l.baseY + noise(l.nOff + (N - 1) * .018 + li * .1, li * 1.731) * l.amp;
        l.pts.copyWithin(0, 1);
        l.pts[N - 1] = newY;

        const g = cx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0,    "transparent");
        g.addColorStop(.4,   `hsla(${l.hue},88%,65%,${l.alpha * .28})`);
        g.addColorStop(.82,  `hsla(${l.hue},88%,65%,${l.alpha})`);
        g.addColorStop(1,    `hsla(${l.hue},88%,72%,${l.alpha * 1.2})`);

        cx.beginPath();
        for (let i = 0; i < N; i++) {
          const x = (i / (N - 1)) * w;
          const y = l.pts[i] * h;
          i === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
        }
        cx.strokeStyle = g;
        cx.lineWidth   = l.lw;
        cx.shadowBlur  = l.lw < 1 ? 3 : 6;
        cx.shadowColor = `hsla(${l.hue},100%,65%,.45)`;
        cx.stroke();
        cx.shadowBlur  = 0;
      }

      // Particles
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy; d.a -= d.decay;
        if (d.a <= 0 || d.y < -5) {
          d.x     = Math.random() * w;
          d.y     = h + 5;
          d.a     = .2 + Math.random() * .7;
          d.vy    = -(0.22 + Math.random() * .42);
          d.hue   = [25, 140, 0, 220][Math.floor(Math.random() * 4)];
        }
        cx.beginPath();
        cx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        cx.fillStyle  = `hsla(${d.hue},90%,70%,${d.a})`;
        cx.shadowBlur = d.r * 3.5;
        cx.shadowColor = `hsla(${d.hue},100%,70%,.9)`;
        cx.fill();
        cx.shadowBlur = 0;
      }

      // Spawn labels
      if (S.current.tick >= S.current.nextLabel) {
        const [text, hue] = LABEL_DATA[Math.floor(Math.random() * LABEL_DATA.length)];
        labels.push({
          x:    60 + Math.random() * Math.max(w - 180, 60),
          y:    h * .55 + Math.random() * h * .45,
          vy:   -(0.28 + Math.random() * .32),
          text, hue, a: 0, life: 0,
          max: 140 + Math.floor(Math.random() * 100),
        });
        S.current.nextLabel = S.current.tick + 65 + Math.floor(Math.random() * 45);
      }

      // Render labels
      cx.font = `500 10px "IBM Plex Mono",monospace`;
      for (let i = labels.length - 1; i >= 0; i--) {
        const l = labels[i];
        l.y += l.vy; l.life++;
        const fi = Math.min(l.life / 22, 1);
        const fo = l.life > l.max - 32 ? (l.max - l.life) / 32 : 1;
        l.a = fi * fo * .58;
        if (l.life >= l.max) { labels.splice(i, 1); continue; }
        cx.globalAlpha = l.a;
        cx.fillStyle   = `hsl(${l.hue},88%,68%)`;
        cx.shadowBlur  = 7;
        cx.shadowColor = `hsl(${l.hue},100%,68%)`;
        cx.fillText(l.text, l.x, l.y);
        cx.shadowBlur  = 0;
        cx.globalAlpha = 1;
      }

      raf.current = requestAnimationFrame(draw);
    };

    raf.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={cvs}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
