import { MOCK_SQUADS, formatScore, scoreClass, shortWallet, formatUSDC } from "@/lib/mock-data";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

function MemberRow({
  wallet,
  score,
  tradeCount,
  maxScore,
}: {
  wallet: string;
  score: number;
  tradeCount: number;
  maxScore: number;
}) {
  const barW = maxScore > 0 ? (Math.abs(score) / maxScore) * 100 : 0;
  const pos = score >= 0;
  const initials = wallet.slice(0, 2).toUpperCase();

  return (
    <tr>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 2,
              backgroundColor: "var(--surface-raised)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 600,
              color: "var(--text-muted)",
              letterSpacing: "0.04em",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-muted)" }}>
            {wallet}
          </span>
        </div>
      </td>
      <td style={{ textAlign: "right" }}>
        <span className={scoreClass(score)} style={{ fontFamily: "monospace", fontWeight: 600 }}>
          {formatScore(score)}
        </span>
      </td>
      <td style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, fontFamily: "monospace" }}>
        {tradeCount}
      </td>
      <td style={{ width: 140 }}>
        <div
          style={{
            height: 3,
            backgroundColor: "var(--border-subtle)",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <div
            className={`pnl-bar ${pos ? "pnl-bar-pos" : "pnl-bar-neg"}`}
            style={{ width: `${barW}%`, height: "100%", borderRadius: 1 }}
          />
        </div>
      </td>
    </tr>
  );
}

export default async function SquadDetailPage({ params }: Props) {
  const { id } = await params;
  const squad = MOCK_SQUADS.find((s) => s.pubkey === id) ?? MOCK_SQUADS[0];
  const maxMemberScore = Math.max(...squad.roundHistory.map(Math.abs), 1);

  // Fake member data derived from squad
  const members = squad.members.map((w, i) => ({
    wallet: w,
    score: Math.floor(squad.aggregateScore * (0.7 + i * 0.15) + (i % 2 === 0 ? 100 : -50)),
    tradeCount: 4 + i * 2,
  }));
  const maxMemberS = Math.max(...members.map((m) => Math.abs(m.score)), 1);
  const maxBarScore = Math.max(...squad.roundHistory.map(Math.abs), 1);

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      {/* Back */}
      <Link
        href="/squads"
        style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "none", letterSpacing: "0.04em" }}
      >
        ← SQUADS
      </Link>

      {/* Squad header */}
      <div
        style={{
          marginTop: 16,
          marginBottom: 24,
          padding: "20px 24px",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color: squad.rank <= 3 ? "var(--gold)" : "var(--text-muted)",
                border: `1px solid ${squad.rank <= 3 ? "var(--gold)" : "var(--border)"}`,
                padding: "2px 7px",
                borderRadius: 2,
                letterSpacing: "0.06em",
              }}
            >
              RANK #{String(squad.rank).padStart(2, "0")}
            </span>
            <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "0.02em" }}>
              {squad.name}
            </h1>
            {squad.inviteOnly && (
              <span
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  padding: "2px 6px",
                  borderRadius: 2,
                  letterSpacing: "0.08em",
                }}
              >
                INVITE ONLY
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Led by{" "}
            <span style={{ fontFamily: "monospace", color: "var(--text-dim)" }}>
              {squad.leader}
            </span>{" "}
            · {squad.memberCount}/5 members
          </div>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 3 }}>
              SQUAD SCORE
            </div>
            <div
              className={scoreClass(squad.aggregateScore)}
              style={{ fontSize: 22, fontWeight: 700, fontFamily: "monospace" }}
            >
              {formatScore(squad.aggregateScore)}
            </div>
          </div>
          {squad.prizeAmount > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 3 }}>
                PRIZE
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--success)", fontFamily: "monospace" }}>
                {formatUSDC(squad.prizeAmount)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="col-layout-main">
        {/* Members table */}
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
          >
            MEMBER BREAKDOWN
          </div>
          {/* Desktop: table */}
          <div className="show-desktop" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th style={{ textAlign: "right" }}>Score</th>
                  <th style={{ textAlign: "center" }}>Trades</th>
                  <th>PnL Bar</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <MemberRow key={m.wallet} wallet={m.wallet} score={m.score} tradeCount={m.tradeCount} maxScore={maxMemberS} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: member cards */}
          <div className="show-mobile" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {members.map((m) => {
              const barW = maxMemberS > 0 ? (Math.abs(m.score) / maxMemberS) * 100 : 0;
              const pos  = m.score >= 0;
              return (
                <div key={m.wallet} style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>{m.wallet}</span>
                    <span className={scoreClass(m.score)} style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{formatScore(m.score)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.tradeCount} trades</span>
                  </div>
                  <div style={{ height: 3, backgroundColor: "var(--border-subtle)", borderRadius: 1, overflow: "hidden" }}>
                    <div className={`pnl-bar ${pos ? "pnl-bar-pos" : "pnl-bar-neg"}`} style={{ width: `${barW}%`, height: "100%", borderRadius: 1 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Round history chart */}
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
          >
            ROUND HISTORY
          </div>
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "16px 14px",
            }}
          >
            {squad.roundHistory.map((score, i) => {
              const pos = score >= 0;
              const barW = (Math.abs(score) / maxBarScore) * 100;
              return (
                <div key={i} style={{ marginBottom: i < squad.roundHistory.length - 1 ? 10 : 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    <span>Round {i + 1}</span>
                    <span className={scoreClass(score)} style={{ fontFamily: "monospace" }}>
                      {formatScore(score)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      backgroundColor: "var(--border-subtle)",
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      className={`pnl-bar ${pos ? "pnl-bar-pos" : "pnl-bar-neg"}`}
                      style={{ width: `${barW}%`, height: "100%", borderRadius: 1 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Join CTA */}
          {squad.memberCount < 5 && !squad.inviteOnly && (
            <button
              style={{
                width: "100%",
                marginTop: 12,
                padding: "10px",
                backgroundColor: "transparent",
                border: "1px solid var(--accent)",
                borderRadius: 3,
                color: "var(--accent)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "monospace",
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              JOIN THIS SQUAD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
