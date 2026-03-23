"use client";
import { useState } from "react";
import SquadCard from "@/components/SquadCard";
import { MOCK_SQUADS, MOCK_PREDICTIONS, MOCK_COMPETITION, formatUSDC } from "@/lib/mock-data";

export default function PredictPage() {
  const [stakes, setStakes] = useState<Record<string, number>>({});
  const [placed, setPlaced] = useState<Set<string>>(new Set());

  const totalStaked = MOCK_PREDICTIONS.reduce((s, p) => s + p.totalStaked, 0);

  function handleStake(squadPubkey: string) {
    setPlaced((prev) => new Set([...prev, squadPubkey]));
  }

  return (
    <div className="page-container" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "0.02em", marginBottom: 4 }}>
          PREDICTION MARKET
        </h1>
        <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.02em", maxWidth: 560, lineHeight: 1.6 }}>
          Stake USDC on which squad you think will win Round {MOCK_COMPETITION.roundNumber}.
          Pool closes when the round starts. Winning bettors split the pool proportionally. 5% fee.
        </p>
      </div>

      {/* Pool summary */}
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          padding: "16px 20px",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>
              TOTAL STAKED
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: "var(--accent)" }}>
              {formatUSDC(totalStaked)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>
                POOL STATUS
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--success)", fontFamily: "monospace" }}>
                OPEN
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>
                HOUSE FEE
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace", color: "var(--text-dim)" }}>
                5%
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>
                MAX STAKE
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace", color: "var(--text-dim)" }}>
                $100
              </div>
            </div>
          </div>
        </div>

        {/* Stacked odds bar — scrollable on very narrow screens */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 6 }}>
            POOL DISTRIBUTION
          </div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div
            style={{
              height: 8,
              borderRadius: 2,
              overflow: "hidden",
              display: "flex",
              gap: 1,
              minWidth: 280,
            }}
          >
            {MOCK_PREDICTIONS.map((p, i) => {
              const colors = ["var(--accent)", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899"];
              return (
                <div
                  key={p.squadPubkey}
                  title={`${p.squadName}: ${(p.impliedOdds * 100).toFixed(1)}%`}
                  style={{
                    flex: p.totalStaked,
                    backgroundColor: colors[i % colors.length],
                    opacity: 0.8,
                    cursor: "help",
                  }}
                />
              );
            })}
          </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {MOCK_PREDICTIONS.map((p, i) => {
            const colors = ["var(--accent)", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899"];
            return (
              <div key={p.squadPubkey} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 1,
                    backgroundColor: colors[i % colors.length],
                    opacity: 0.8,
                  }}
                />
                <span style={{ color: "var(--text-muted)" }}>
                  {p.squadName.split(" ").slice(0, 2).join(" ")} {(p.impliedOdds * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Squad grid — auto-fill on desktop, single column on very small screens */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
          gap: 10,
        }}
      >
        {MOCK_SQUADS.slice(0, 6).map((squad) => {
          const pred = MOCK_PREDICTIONS.find((p) => p.squadPubkey === squad.pubkey);
          const isPlaced = placed.has(squad.pubkey);

          return isPlaced ? (
            <div
              key={squad.id}
              style={{
                backgroundColor: "var(--success-dim)",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 4,
                padding: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 6,
                minHeight: 120,
              }}
            >
              <div style={{ color: "var(--success)", fontSize: 16 }}>✓</div>
              <div style={{ fontSize: 11, color: "var(--success)", fontWeight: 500 }}>{squad.name}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                Stake placed: ${stakes[squad.pubkey] ?? 10}
              </div>
            </div>
          ) : (
            <SquadCard
              key={squad.id}
              squad={squad}
              showStake
              stakeAmount={stakes[squad.pubkey] ?? 10}
              onStakeChange={(v) => setStakes((prev) => ({ ...prev, [squad.pubkey]: v }))}
              onStake={() => handleStake(squad.pubkey)}
              impliedOdds={pred?.impliedOdds}
              totalStaked={pred?.totalStaked}
            />
          );
        })}
      </div>

      <p style={{ marginTop: 20, fontSize: 10, color: "var(--text-muted)", lineHeight: 1.7 }}>
        Squad members cannot predict on their own squad.
        Predictions lock when competition starts.
        Connect wallet to place a real prediction on devnet.
      </p>
    </div>
  );
}
