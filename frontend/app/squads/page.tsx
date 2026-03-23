"use client";
import { useState, useEffect } from "react";
import CompetitionTimer from "@/components/CompetitionTimer";
import SquadLeaderboard from "@/components/SquadLeaderboard";
import SquadCard from "@/components/SquadCard";
import { type Squad, type Competition, MOCK_COMPETITION, MOCK_SQUADS } from "@/lib/mock-data";
import { api } from "@/lib/api";

type View = "list" | "grid";

function mapApiSquads(rows: ReturnType<typeof Array.prototype.map>): Squad[] {
  return (rows as Array<Record<string, unknown>>).map((s, i) => ({
    id: (s.squad_id as number) ?? i,
    pubkey: (s.squad_pubkey as string) ?? "",
    name: (s.name as string) ?? "",
    leader: (s.leader_pubkey as string) ?? "",
    members: [],
    memberCount: (s.member_count as number) ?? 0,
    inviteOnly: (s.invite_only as boolean) ?? false,
    aggregateScore: (s.aggregate_score as number) ?? 0,
    rank: (s.rank as number) ?? i + 1,
    prevRank: ((s.rank as number) ?? i + 1) + (Math.random() > 0.5 ? 1 : -1),
    prizeAmount: (s.prize_amount as number) ?? 0,
    roundHistory: [],
  }));
}

function mapApiCompetition(c: Record<string, unknown>): Competition {
  return {
    id: c.competition_id as number,
    pubkey: c.competition_pubkey as string,
    seasonId: c.season_id as number,
    roundNumber: c.round_number as number,
    startTime: new Date(c.start_time as string).getTime() / 1000,
    endTime: new Date(c.end_time as string).getTime() / 1000,
    totalPrize: parseInt((c.total_prize_amount as string) ?? "0"),
    totalSquads: c.total_squads as number,
    status: (c.status as Competition["status"]) ?? "Active",
  };
}

export default function SquadsPage() {
  const [view, setView] = useState<View>("list");
  const [search, setSearch] = useState("");
  const [squads, setSquads] = useState<Squad[]>(MOCK_SQUADS);
  const [competition, setCompetition] = useState<Competition>(MOCK_COMPETITION);

  useEffect(() => {
    api.competition.leaderboard()
      .then((rows) => {
        if (rows?.length) setSquads(mapApiSquads(rows as unknown[]));
      })
      .catch(() => {});

    api.competition.active()
      .then((c) => {
        if (c) setCompetition(mapApiCompetition(c as unknown as Record<string, unknown>));
      })
      .catch(() => {});
  }, []);

  const filtered = squads.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container" style={{ maxWidth: 1100 }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "0.02em", marginBottom: 3 }}>
            SQUAD LEADERBOARD
          </h1>
          <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
            SEASON {competition.seasonId} · ROUND {competition.roundNumber} · {competition.totalSquads} SQUADS
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            style={{
              padding: "11px 16px", minHeight: 44, backgroundColor: "transparent",
              border: "1px solid var(--border)", borderRadius: 3, color: "var(--text-muted)",
              fontSize: 11, cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-subtle)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
          >
            JOIN SQUAD
          </button>
          <button
            style={{
              padding: "11px 16px", minHeight: 44, backgroundColor: "var(--accent)",
              border: "1px solid var(--accent)", borderRadius: 3, color: "white",
              fontSize: 11, cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em", fontWeight: 600,
            }}
          >
            + CREATE SQUAD
          </button>
        </div>
      </div>

      {/* ── Competition timer ────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4,
          padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center",
          justifyContent: "space-between", flexWrap: "wrap", gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 6 }}>
            ROUND {competition.roundNumber} ENDS IN
          </div>
          <CompetitionTimer endTime={competition.endTime} />
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { label: "PRIZE POOL", value: "$5,000", accent: true },
            { label: "SQUADS",     value: String(competition.totalSquads) },
            { label: "STATUS",     value: competition.status.toUpperCase(), accent: true },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: accent ? "var(--accent)" : "var(--text)", fontFamily: "monospace" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search + view toggle ─────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 260 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 11, pointerEvents: "none" }}>⌕</span>
          <input
            placeholder="Search squads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "7px 10px 7px 28px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 3, color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
          />
        </div>

        <div style={{ display: "flex", gap: 1 }}>
          {(["list", "grid"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "6px 12px", backgroundColor: view === v ? "var(--surface-raised)" : "transparent",
                border: "1px solid var(--border)", color: view === v ? "var(--text)" : "var(--text-muted)",
                fontSize: 10, cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em",
                borderRadius: v === "list" ? "3px 0 0 3px" : "0 3px 3px 0",
                marginLeft: v === "grid" ? "-1px" : 0,
              }}
            >
              {v === "list" ? "≡ LIST" : "⊞ GRID"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Leaderboard or grid ─────────────────────────────────────── */}
      {view === "list" ? (
        <SquadLeaderboard squads={filtered} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {filtered.map((squad) => (
            <SquadCard key={squad.id} squad={squad} showJoin />
          ))}
        </div>
      )}
    </div>
  );
}
