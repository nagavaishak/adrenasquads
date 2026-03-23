import Link from "next/link";
import { Squad, formatScore, scoreClass, formatUSDC } from "@/lib/mock-data";

interface Props {
  squad: Squad;
  showJoin?: boolean;
  showStake?: boolean;
  stakeAmount?: number;
  onStakeChange?: (v: number) => void;
  onStake?: () => void;
  impliedOdds?: number;
  totalStaked?: number;
}

export default function SquadCard({
  squad,
  showJoin,
  showStake,
  stakeAmount,
  onStakeChange,
  onStake,
  impliedOdds,
  totalStaked,
}: Props) {
  const isPos = squad.aggregateScore >= 0;

  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        overflow: "hidden",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.14)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
      }}
    >
      {/* Card header */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                color: "var(--text-muted)",
                minWidth: 18,
              }}
            >
              #{String(squad.rank).padStart(2, "0")}
            </span>
            <Link
              href={`/squads/${squad.pubkey}`}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text)",
                textDecoration: "none",
                letterSpacing: "0.01em",
              }}
            >
              {squad.name}
            </Link>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
            {squad.memberCount}/5 members · {squad.inviteOnly ? "Invite only" : "Open"}
          </div>
        </div>

        <span
          className={scoreClass(squad.aggregateScore)}
          style={{ fontSize: 15, fontWeight: 600, fontFamily: "monospace" }}
        >
          {formatScore(squad.aggregateScore)}
        </span>
      </div>

      {/* Mini chart — round history bars */}
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "flex-end",
          gap: 3,
          height: 40,
          borderBottom: showStake ? "1px solid var(--border-subtle)" : undefined,
        }}
      >
        {squad.roundHistory.map((score, i) => {
          const isActive = i === squad.roundHistory.length - 1;
          const maxAbs = Math.max(...squad.roundHistory.map(Math.abs), 1);
          const h = Math.max(3, (Math.abs(score) / maxAbs) * 26);
          const pos = score >= 0;
          return (
            <div
              key={i}
              title={`Round ${i + 1}: ${formatScore(score)}`}
              style={{
                flex: 1,
                height: h,
                backgroundColor: isActive
                  ? pos ? "var(--success)" : "var(--danger)"
                  : pos ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)",
                borderRadius: "1px 1px 0 0",
                transition: "height 0.3s",
                cursor: "help",
              }}
            />
          );
        })}
        <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 2, alignSelf: "center" }}>
          R{squad.roundHistory.length}
        </span>
      </div>

      {/* Prediction stake UI */}
      {showStake && (
        <div style={{ padding: "10px 14px" }}>
          {impliedOdds !== undefined && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
                fontSize: 10,
                color: "var(--text-muted)",
              }}
            >
              <span>Pool share: {(impliedOdds * 100).toFixed(1)}%</span>
              {totalStaked !== undefined && (
                <span>Staked: {formatUSDC(totalStaked)}</span>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <span
                style={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 10,
                  color: "var(--text-muted)",
                }}
              >
                $
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={stakeAmount ?? 10}
                onChange={(e) => onStakeChange?.(Number(e.target.value))}
                style={{
                  width: "100%",
                  paddingLeft: 20,
                  paddingRight: 8,
                  paddingTop: 6,
                  paddingBottom: 6,
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 3,
                  color: "var(--text)",
                  fontSize: 12,
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
            </div>
            <button
              onClick={onStake}
              style={{
                padding: "6px 14px",
                backgroundColor: "var(--accent)",
                color: "white",
                border: "none",
                borderRadius: 3,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "monospace",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}
            >
              STAKE
            </button>
          </div>
        </div>
      )}

      {/* Join button */}
      {showJoin && squad.memberCount < 5 && !squad.inviteOnly && (
        <div style={{ padding: "10px 14px" }}>
          <button
            style={{
              width: "100%",
              padding: "7px",
              backgroundColor: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 3,
              color: "var(--text-muted)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "monospace",
              letterSpacing: "0.06em",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            }}
          >
            JOIN SQUAD
          </button>
        </div>
      )}
    </div>
  );
}
