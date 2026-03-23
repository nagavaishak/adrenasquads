"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import SquadCard from "@/components/SquadCard";
import { MOCK_SQUADS, MOCK_PREDICTIONS, MOCK_COMPETITION, formatUSDC } from "@/lib/mock-data";

interface PredictionSquad {
  squadPubkey: string;
  totalStaked: number;
  predictionCount: number;
  impliedOdds: number;
}

interface PredictionPool {
  totalStaked: number;
  squads: PredictionSquad[];
}

export default function PredictPage() {
  const { connected } = useWallet();
  const [stakes, setStakes] = useState<Record<string, number>>({});
  const [placed, setPlaced] = useState<Set<string>>(new Set());
  const [pool, setPool] = useState<PredictionPool | null>(null);

  useEffect(() => {
    fetch("/api/predictions/1")
      .then((r) => r.json())
      .then((j) => { if (j.success) setPool(j.data); })
      .catch(() => {});
  }, []);

  // Build prediction display from API data or fallback
  const predictions = pool
    ? pool.squads.map((s) => {
        const squad = MOCK_SQUADS.find((sq) => sq.pubkey === s.squadPubkey);
        return {
          squadPubkey: s.squadPubkey,
          squadName: squad?.name ?? `Squad ${s.squadPubkey.slice(0, 6)}`,
          totalStaked: s.totalStaked * 1_000_000,
          predictionCount: s.predictionCount,
          impliedOdds: 1 / (pool.squads.length > 0 ? s.totalStaked / pool.totalStaked : 1),
        };
      })
    : MOCK_PREDICTIONS;

  const totalStaked = pool
    ? pool.totalStaked * 1_000_000
    : predictions.reduce((s, p) => s + p.totalStaked, 0);

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

        {/* Stacked odds bar */}
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
              {predictions.map((p, i) => {
                const colors = ["var(--accent)", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899"];
                return (
                  <div
                    key={p.squadPubkey}
                    title={`${p.squadName}: ${((p.totalStaked / totalStaked) * 100).toFixed(1)}%`}
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
          {predictions.map((p, i) => {
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
                  {p.squadName.split(" ").slice(0, 2).join(" ")} {((p.totalStaked / totalStaked) * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Squad grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
          gap: 10,
        }}
      >
        {MOCK_SQUADS.slice(0, 6).map((squad) => {
          const pred = predictions.find((p) => p.squadPubkey === squad.pubkey);
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

      {/* Wallet connect prompt */}
      {!connected && (
        <div
          style={{
            marginTop: 20,
            backgroundColor: "rgba(249,115,22,0.05)",
            border: "1px solid rgba(249,115,22,0.15)",
            borderRadius: 4,
            padding: "14px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
            Connect your wallet to place real predictions on devnet. Squad members cannot predict on their own squad.
          </p>
          <WalletMultiButton
            style={{
              padding: "7px 14px",
              backgroundColor: "var(--accent)",
              border: "none",
              borderRadius: 3,
              color: "#000",
              fontSize: 11,
              fontFamily: "var(--font-ibm-mono), monospace",
              letterSpacing: "0.06em",
              height: "auto",
              lineHeight: "1.4",
              flexShrink: 0,
            }}
          />
        </div>
      )}

      {connected && (
        <p style={{ marginTop: 20, fontSize: 10, color: "var(--text-muted)", lineHeight: 1.7 }}>
          Squad members cannot predict on their own squad (enforced on-chain).
          Predictions lock when competition starts. Pool payouts are proportional minus 5% house fee.
        </p>
      )}
    </div>
  );
}
