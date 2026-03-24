"use client";
import Link from "next/link";
import { Squad, formatScore, scoreClass, formatUSDC } from "@/lib/mock-data";

interface Props {
  squads: Squad[];
}

function TrendArrow({ current, prev }: { current: number; prev: number }) {
  if (current < prev) return <span style={{ color: "var(--success)", fontSize: 10 }}>▲</span>;
  if (current > prev) return <span style={{ color: "var(--danger)", fontSize: 10 }}>▼</span>;
  return <span style={{ color: "var(--text-muted)", fontSize: 10 }}>—</span>;
}

function RankBadge({ rank }: { rank: number }) {
  const isGold   = rank === 1;
  const isSilver = rank === 2;
  const isBronze = rank === 3;
  const color = isGold ? "var(--gold)" : isSilver ? "#9ca3af" : isBronze ? "#b45309" : "var(--text-muted)";

  return (
    <span style={{ fontWeight: isGold || isSilver || isBronze ? 600 : 400, color, fontFamily: "monospace", fontSize: 12, minWidth: 24, display: "inline-block", textAlign: "right" }}>
      {String(rank).padStart(2, "0")}
    </span>
  );
}

export default function SquadLeaderboard({ squads }: Props) {
  const maxScore = Math.max(...squads.map((s) => Math.abs(s.aggregateScore)), 1);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden", backgroundColor: "var(--surface)" }}>

      {/* ── Desktop table view ─────────────────────────────────────────────── */}
      <div className="show-desktop">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 48, textAlign: "center" }}>#</th>
              <th>Squad</th>
              <th style={{ textAlign: "right" }}>Score</th>
              <th style={{ textAlign: "center" }}>Mbrs</th>
              <th>Performance</th>
              <th style={{ textAlign: "right" }}>Prize</th>
              <th style={{ width: 32, textAlign: "center" }}>↕</th>
            </tr>
          </thead>
          <tbody>
            {squads.map((squad, i) => {
              const isFirst  = squad.rank === 1;
              const barWidth = (Math.abs(squad.aggregateScore) / maxScore) * 100;
              const isPos    = squad.aggregateScore >= 0;

              return (
                <tr key={squad.id} className={isFirst ? "rank-one" : ""} style={{ animationDelay: `${i * 0.04}s`, cursor: "pointer" }}>
                  <td style={{ textAlign: "center" }}>
                    <RankBadge rank={squad.rank} />
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Link href={`/squads/${squad.pubkey}`} style={{ color: isFirst ? "var(--gold)" : "var(--text)", textDecoration: "none", fontWeight: 500, fontSize: 12, letterSpacing: "0.01em" }}>
                        {squad.name}
                      </Link>
                      {squad.isAgent && (
                        <span title="AI Agent Squad" style={{ fontSize: 9, color: "#a78bfa", border: "1px solid #a78bfa40", padding: "1px 5px", borderRadius: 2, letterSpacing: "0.06em", fontFamily: "monospace" }}>
                          AI
                        </span>
                      )}
                      {squad.inviteOnly && (
                        <span style={{ fontSize: 9, color: "var(--text-muted)", border: "1px solid var(--border)", padding: "1px 4px", borderRadius: 2, letterSpacing: "0.06em" }}>
                          INV
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span className={scoreClass(squad.aggregateScore)} style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 13 }}>
                      {formatScore(squad.aggregateScore)}
                    </span>
                  </td>
                  <td style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>{squad.memberCount}/5</td>
                  <td style={{ width: 120 }}>
                    <div style={{ height: 3, width: "100%", backgroundColor: "var(--border-subtle)", borderRadius: 1, overflow: "hidden" }}>
                      <div className={`pnl-bar ${isPos ? "pnl-bar-pos" : "pnl-bar-neg"}`} style={{ width: `${barWidth}%`, height: "100%", borderRadius: 1 }} />
                    </div>
                  </td>
                  <td style={{ textAlign: "right", fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                    {squad.prizeAmount > 0 ? <span style={{ color: "var(--success)" }}>{formatUSDC(squad.prizeAmount)}</span> : "—"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <TrendArrow current={squad.rank} prev={squad.prevRank} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card stack ──────────────────────────────────────────────── */}
      <div className="show-mobile">
        {squads.map((squad, i) => {
          const isFirst  = squad.rank === 1;
          const barWidth = (Math.abs(squad.aggregateScore) / maxScore) * 100;
          const isPos    = squad.aggregateScore >= 0;

          return (
            <Link
              key={squad.id}
              href={`/squads/${squad.pubkey}`}
              className={isFirst ? "rank-one" : ""}
              style={{
                display: "block",
                textDecoration: "none",
                padding: "12px 14px",
                borderBottom: i < squads.length - 1 ? "1px solid var(--border-subtle)" : "none",
                animationDelay: `${i * 0.04}s`,
              }}
            >
              {/* Row 1: rank + name + trend */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <RankBadge rank={squad.rank} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: isFirst ? "var(--gold)" : "var(--text)", letterSpacing: "0.01em" }}>
                  {squad.name}
                </span>
                {squad.isAgent && (
                  <span style={{ fontSize: 9, color: "#a78bfa", border: "1px solid #a78bfa40", padding: "1px 5px", borderRadius: 2, letterSpacing: "0.06em", fontFamily: "monospace" }}>
                    AI
                  </span>
                )}
                {squad.inviteOnly && (
                  <span style={{ fontSize: 9, color: "var(--text-muted)", border: "1px solid var(--border)", padding: "1px 4px", borderRadius: 2, letterSpacing: "0.06em" }}>
                    INV
                  </span>
                )}
                <TrendArrow current={squad.rank} prev={squad.prevRank} />
              </div>

              {/* Row 2: score + members + prize */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 7 }}>
                <span className={scoreClass(squad.aggregateScore)} style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14 }}>
                  {formatScore(squad.aggregateScore)}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {squad.memberCount}/5 members
                </span>
                {squad.prizeAmount > 0 && (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--success)", fontFamily: "monospace" }}>
                    {formatUSDC(squad.prizeAmount)}
                  </span>
                )}
              </div>

              {/* Row 3: PnL bar */}
              <div style={{ height: 3, backgroundColor: "var(--border-subtle)", borderRadius: 1, overflow: "hidden" }}>
                <div className={`pnl-bar ${isPos ? "pnl-bar-pos" : "pnl-bar-neg"}`} style={{ width: `${barWidth}%`, height: "100%", borderRadius: 1 }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
