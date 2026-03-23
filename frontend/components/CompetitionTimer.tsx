"use client";
import { useEffect, useState } from "react";

interface Props {
  endTime: number; // unix seconds
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(endTime: number): TimeLeft {
  const diff = Math.max(0, endTime - Date.now() / 1000);
  return {
    days:    Math.floor(diff / 86400),
    hours:   Math.floor((diff % 86400) / 3600),
    minutes: Math.floor((diff % 3600) / 60),
    seconds: Math.floor(diff % 60),
  };
}

function DigitBox({ ch, isSec }: { ch: string; isSec: boolean }) {
  return (
    <div
      style={{
        width: 36,
        height: 48,
        backgroundColor: "var(--surface-raised, #161a21)",
        border: "1px solid var(--border, #1e2028)",
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 26,
        fontWeight: 600,
        color: isSec ? "var(--accent, #f97316)" : "var(--text, #e8e9ec)",
        fontFamily: "monospace",
      }}
    >
      {ch}
    </div>
  );
}

function Digit({ value, label }: { value: number; label: string }) {
  const str = String(value).padStart(2, "0");
  const isSec = label === "SEC";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ display: "flex", gap: 2 }}>
        {str.split("").map((ch, i) => (
          <DigitBox key={i} ch={ch} isSec={isSec} />
        ))}
      </div>
      <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--text-muted, #5a6170)" }}>
        {label}
      </div>
    </div>
  );
}

function Sep() {
  return (
    <div
      style={{
        fontSize: 22,
        fontWeight: 300,
        color: "var(--border, #1e2028)",
        marginBottom: 14,
        userSelect: "none",
      }}
    >
      :
    </div>
  );
}

export default function CompetitionTimer({ endTime }: Props) {
  // null on first render — populated in useEffect to avoid hydration mismatch
  const [time, setTime] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setTime(getTimeLeft(endTime));
    if (endTime <= Date.now() / 1000) return;
    const id = setInterval(() => setTime(getTimeLeft(endTime)), 1000);
    return () => clearInterval(id);
  }, [endTime]);

  // Placeholder skeleton while hydrating
  if (!time) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.4 }}>
        {["DAY", "HRS", "MIN", "SEC"].map((label, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: i < 3 ? 8 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ display: "flex", gap: 2 }}>
                <DigitBox ch="—" isSec={false} />
                <DigitBox ch="—" isSec={false} />
              </div>
              <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--text-muted)" }}>{label}</div>
            </div>
            {i < 3 && <Sep />}
          </div>
        ))}
      </div>
    );
  }

  if (endTime < Date.now() / 1000) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: 12, letterSpacing: "0.08em" }}>
        ROUND ENDED · CALCULATING
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Digit value={time.days}    label="DAY" />
      <Sep />
      <Digit value={time.hours}   label="HRS" />
      <Sep />
      <Digit value={time.minutes} label="MIN" />
      <Sep />
      <Digit value={time.seconds} label="SEC" />
    </div>
  );
}
