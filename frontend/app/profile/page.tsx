"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import BadgeGrid from "@/components/BadgeGrid";
import { MOCK_SQUADS, formatScore, scoreClass } from "@/lib/mock-data";

interface ProfileData {
  wallet: string;
  competitions_entered: number;
  total_pnl: number;
  best_rank: number;
  squad_name: string;
  badges: string[];
}

const MOCK_SQUAD = MOCK_SQUADS[0];

export default function ProfilePage() {
  const { publicKey, connected } = useWallet();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const walletDisplay = connected && publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "Not connected";

  useEffect(() => {
    if (!connected || !publicKey) {
      setProfile(null);
      return;
    }
    fetch(`/api/profile/${publicKey.toBase58()}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setProfile(j.data); })
      .catch(() => {});
  }, [connected, publicKey]);

  const STATS = [
    { label: "COMPETITIONS", value: profile ? String(profile.competitions_entered) : "7" },
    { label: "SQUAD WINS", value: "2" },
    { label: "BEST RANK", value: profile ? `#${String(profile.best_rank).padStart(2, "0")}` : "#01" },
    { label: "TOTAL PnL", value: profile ? `+${(profile.total_pnl / 100).toFixed(2)}%` : "+18.40%", accent: "success" as const },
    { label: "PREDICTIONS WON", value: "5/9" },
    { label: "PRIZE EARNED", value: "$2,750", accent: "success" as const },
  ];

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "0.02em", marginBottom: 24 }}>
        PROFILE
      </h1>

      {/* Identity */}
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          padding: "18px 20px",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Avatar */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 3,
              backgroundColor: connected ? "var(--accent-dim)" : "var(--surface)",
              border: `1px solid ${connected ? "rgba(249,115,22,0.3)" : "var(--border)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              color: connected ? "var(--accent)" : "var(--text-muted)",
              letterSpacing: "0.04em",
              flexShrink: 0,
            }}
          >
            {connected && publicKey ? publicKey.toBase58().slice(0, 2).toUpperCase() : "??"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, fontFamily: "monospace" }}>
              {walletDisplay}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
              {connected ? (profile?.squad_name ?? "SEASON 1 PARTICIPANT") : "CONNECT YOUR WALLET"}
            </div>
          </div>
        </div>

        <WalletMultiButton
          style={{
            padding: "7px 16px",
            backgroundColor: connected ? "transparent" : "var(--accent)",
            border: `1px solid ${connected ? "var(--border)" : "var(--accent)"}`,
            borderRadius: 3,
            color: connected ? "var(--text-muted)" : "#000",
            fontSize: 11,
            fontFamily: "var(--font-ibm-mono), monospace",
            letterSpacing: "0.06em",
            height: "auto",
            lineHeight: "1.4",
          }}
        />
      </div>

      {!connected && (
        <div
          style={{
            backgroundColor: "rgba(249,115,22,0.05)",
            border: "1px solid rgba(249,115,22,0.15)",
            borderRadius: 4,
            padding: "14px 16px",
            marginBottom: 16,
            fontSize: 11,
            color: "var(--text-muted)",
            lineHeight: 1.7,
          }}
        >
          Connect a Solana wallet to view your on-chain profile, squad membership, and achievement badges.
          This demo runs on <strong style={{ color: "var(--accent)" }}>devnet</strong> &mdash; no real funds required.
        </div>
      )}

      {/* Stats grid */}
      <div
        style={{ display: "grid", gap: 8, marginBottom: 16 }}
        className="stats-grid"
      >
        {STATS.map(({ label, value, accent }) => (
          <div
            key={label}
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 6 }}>
              {label}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "monospace",
                color: accent === "success" ? "var(--success)" : "var(--text)",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="col-layout-profile">
        {/* Badges */}
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 10 }}>
            ACHIEVEMENT BADGES
          </div>
          <BadgeGrid unlockedIds={["streak", "diamond", "builder"]} />
        </div>

        {/* Current squad */}
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 10 }}>
            CURRENT SQUAD
          </div>
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>
                  {profile?.squad_name ?? MOCK_SQUAD.name}
                </div>
                <div style={{ fontSize: 9, letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                  LEADER
                </div>
              </div>
              <span
                style={{
                  fontSize: 9,
                  color: "var(--gold)",
                  border: "1px solid rgba(201,153,58,0.3)",
                  padding: "2px 6px",
                  borderRadius: 2,
                  letterSpacing: "0.06em",
                }}
              >
                RANK #{MOCK_SQUAD.rank.toString().padStart(2, "0")}
              </span>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
                {MOCK_SQUAD.memberCount}/5 members
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {MOCK_SQUAD.members.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 10,
                      fontFamily: "monospace",
                      color: i === 0 && connected ? "var(--accent)" : "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {i === 0 && connected && (
                      <span style={{ fontSize: 7, color: "var(--accent)" }}>●</span>
                    )}
                    {i === 0 && connected && publicKey
                      ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
                      : m}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
              <div
                className={scoreClass(MOCK_SQUAD.aggregateScore)}
                style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}
              >
                {formatScore(MOCK_SQUAD.aggregateScore)}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                squad score &middot; round 3
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
