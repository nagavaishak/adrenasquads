"use client";

interface Strategy {
  leverage: number;
  directionBias: number;
  holdDuration: number;
  winRate: number;
  diversification: number;
  riskAppetite: number;
}

interface Props {
  strategy: Strategy;
  size?: number;
}

const AXES = [
  { label: "LEVERAGE",    key: "leverage"       },
  { label: "LONG BIAS",   key: "directionBias"  },
  { label: "HOLD TIME",   key: "holdDuration"   },
  { label: "WIN RATE",    key: "winRate"         },
  { label: "DIVERSITY",   key: "diversification"},
  { label: "RISK",        key: "riskAppetite"   },
] as const;

function hex(cx: number, cy: number, r: number, values: number[]): string {
  return values
    .map((v, i) => {
      const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
      const rv = v * r;
      return `${cx + rv * Math.cos(a)},${cy + rv * Math.sin(a)}`;
    })
    .join(" ");
}

function gridHex(cx: number, cy: number, r: number): string {
  return hex(cx, cy, r, [1, 1, 1, 1, 1, 1]);
}

export default function StrategyRadar({ strategy, size = 200 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;
  const labelR = size * 0.47;

  const values = AXES.map((ax) => strategy[ax.key]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <polygon
          key={t}
          points={gridHex(cx, cy, maxR * t)}
          fill="none"
          stroke="var(--border)"
          strokeWidth={0.8}
          opacity={t === 1 ? 0.6 : 0.35}
        />
      ))}

      {/* Axis lines */}
      {AXES.map((_, i) => {
        const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + maxR * Math.cos(a)}
            y2={cy + maxR * Math.sin(a)}
            stroke="var(--border)"
            strokeWidth={0.8}
            opacity={0.4}
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={hex(cx, cy, maxR, values)}
        fill="rgba(249,115,22,0.12)"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Data dots */}
      {values.map((v, i) => {
        const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
        const r = v * maxR;
        return (
          <circle
            key={i}
            cx={cx + r * Math.cos(a)}
            cy={cy + r * Math.sin(a)}
            r={2.5}
            fill="var(--accent)"
            opacity={0.9}
          />
        );
      })}

      {/* Axis labels */}
      {AXES.map((ax, i) => {
        const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
        const lx = cx + labelR * Math.cos(a);
        const ly = cy + labelR * Math.sin(a);
        // Text anchor based on x position
        const anchor = lx < cx - 4 ? "end" : lx > cx + 4 ? "start" : "middle";
        // Slight vertical nudge for top/bottom labels
        const dy = ly < cy - 4 ? -4 : ly > cy + 4 ? 10 : 4;
        return (
          <text
            key={i}
            x={lx}
            y={ly + dy}
            textAnchor={anchor}
            fill="var(--text-muted)"
            fontSize={7.5}
            fontFamily="'IBM Plex Mono', monospace"
            letterSpacing="0.06em"
          >
            {ax.label}
          </text>
        );
      })}
    </svg>
  );
}
