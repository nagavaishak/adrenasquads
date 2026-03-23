import BadgeGrid from "@/components/BadgeGrid";
import { MOCK_SQUADS, formatScore, scoreClass, formatUSDC } from "@/lib/mock-data";

const MOCK_WALLET = "9xKq...4mRz";
const MOCK_SQUAD = MOCK_SQUADS[0];

const STATS = [
  { label: "COMPETITIONS",   value: "7" },
  { label: "SQUAD WINS",     value: "2" },
  { label: "BEST RANK",      value: "#01" },
  { label: "TOTAL PnL",      value: "+18.40%", accent: "success" as const },
  { label: "PREDICTIONS WON", value: "5/9" },
  { label: "PRIZE EARNED",   value: "$2,750", accent: "success" as const },
];

export default function ProfilePage() {
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
              backgroundColor: "var(--accent-dim)",
              border: "1px solid rgba(249,115,22,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--accent)",
              letterSpacing: "0.04em",
              flexShrink: 0,
            }}
          >
            9X
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, fontFamily: "monospace" }}>
              {MOCK_WALLET}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
              SEASON 1 PARTICIPANT
            </div>
          </div>
        </div>

        <button
          style={{
            padding: "7px 16px",
            backgroundColor: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 3,
            color: "var(--text-muted)",
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "monospace",
            letterSpacing: "0.06em",
          }}
        >
          CONNECT WALLET
        </button>
      </div>

      {/* Stats grid — 2 cols on mobile, 3 on desktop */}
      <div
        style={{
          display: "grid",
          gap: 8,
          marginBottom: 16,
        }}
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
                color:
                  accent === "success"
                    ? "var(--success)"
                    : "var(--text)",
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
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              marginBottom: 10,
            }}
          >
            ACHIEVEMENT BADGES
          </div>
          <BadgeGrid unlockedIds={["streak", "diamond", "builder"]} />
        </div>

        {/* Current squad */}
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              marginBottom: 10,
            }}
          >
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
                  {MOCK_SQUAD.name}
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
                      color: m === MOCK_WALLET ? "var(--accent)" : "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {m === MOCK_WALLET && (
                      <span style={{ fontSize: 7, color: "var(--accent)" }}>●</span>
                    )}
                    {m}
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
                squad score · round 3
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
