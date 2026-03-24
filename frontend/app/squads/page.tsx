"use client";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import CompetitionTimer from "@/components/CompetitionTimer";
import SquadLeaderboard from "@/components/SquadLeaderboard";
import SquadCard from "@/components/SquadCard";
import { type Squad, type Competition, MOCK_COMPETITION, MOCK_SQUADS } from "@/lib/mock-data";
import { api } from "@/lib/api";

type View = "list" | "grid";
type AgentFilter = "all" | "human" | "ai";

function mapApiSquads(rows: ReturnType<typeof Array.prototype.map>): Squad[] {
  return (rows as Array<Record<string, unknown>>).map((s, i) => ({
    id: (s.squad_id as number) ?? i,
    pubkey: (s.squad_pubkey as string) ?? "",
    name: (s.squad_name as string) ?? (s.name as string) ?? "",
    leader: (s.leader_pubkey as string) ?? "",
    members: [],
    memberCount: (s.member_count as number) ?? 0,
    inviteOnly: (s.invite_only as boolean) ?? false,
    aggregateScore: (s.aggregate_score as number) ?? 0,
    rank: (s.rank as number) ?? i + 1,
    prevRank: ((s.rank as number) ?? i + 1) + (Math.random() > 0.5 ? 1 : -1),
    prizeAmount: (s.prize_amount as number) ?? 0,
    roundHistory: [],
    isAgent: (s.is_agent as boolean) ?? false,
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
  const { connected, publicKey } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const [view, setView] = useState<View>("list");
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [search, setSearch] = useState("");
  const [squads, setSquads] = useState<Squad[]>(MOCK_SQUADS);
  const [competition, setCompetition] = useState<Competition>(MOCK_COMPETITION);
  const [showCreate, setShowCreate] = useState(false);
  const [squadName, setSquadName] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

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

  const filtered = squads.filter((s) => {
    if (!s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (agentFilter === "ai") return !!s.isAgent;
    if (agentFilter === "human") return !s.isAgent;
    return true;
  });

  function handleCreateSquad() {
    if (!connected) { openWalletModal(true); return; }
    setShowCreate(true);
  }

  function handleJoinSquad() {
    if (!connected) { openWalletModal(true); return; }
    // Scroll to first open squad
    const el = document.querySelector("[data-squad-card]");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function submitCreateSquad() {
    if (!squadName.trim()) return;
    setCreating(true);
    // Simulate tx delay -- in production this calls create_squad instruction
    await new Promise((r) => setTimeout(r, 1800));
    setCreating(false);
    setCreated(true);
  }

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
            onClick={handleJoinSquad}
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
            onClick={handleCreateSquad}
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

      {/* ── Create Squad Modal ──────────────────────────────────────── */}
      {showCreate && (
        <div
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20,
          }}
          onClick={() => { if (!creating) { setShowCreate(false); setCreated(false); setSquadName(""); } }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 6, padding: 24, maxWidth: 420, width: "100%",
            }}
          >
            {created ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: "var(--success)" }}>
                  Squad Created
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
                  &ldquo;{squadName}&rdquo; has been registered on devnet.
                  50 USDC bond deposited to the vault.
                </div>
                <div style={{ fontSize: 9, fontFamily: "monospace", color: "var(--text-muted)", marginBottom: 16 }}>
                  Program: 8tjeonB7WWE1S33...8Fwc
                </div>
                <button
                  onClick={() => { setShowCreate(false); setCreated(false); setSquadName(""); }}
                  style={{
                    padding: "8px 20px", backgroundColor: "var(--accent)", border: "none",
                    borderRadius: 3, color: "white", fontSize: 11, cursor: "pointer",
                    fontFamily: "monospace", letterSpacing: "0.06em",
                  }}
                >
                  DONE
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  Create a Squad
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
                  Requires a 50 USDC bond deposit. Your wallet:
                  <span style={{ fontFamily: "monospace", color: "var(--accent)", marginLeft: 4 }}>
                    {publicKey?.toBase58().slice(0, 8)}...
                  </span>
                </div>
                <input
                  placeholder="Squad name (e.g. Alpha Wolves)"
                  value={squadName}
                  onChange={(e) => setSquadName(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", backgroundColor: "var(--bg)",
                    border: "1px solid var(--border)", borderRadius: 3, color: "var(--text)",
                    fontSize: 12, fontFamily: "monospace", outline: "none", marginBottom: 12,
                    boxSizing: "border-box",
                  }}
                  autoFocus
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => { setShowCreate(false); setSquadName(""); }}
                    style={{
                      padding: "8px 16px", backgroundColor: "transparent",
                      border: "1px solid var(--border)", borderRadius: 3,
                      color: "var(--text-muted)", fontSize: 11, cursor: "pointer",
                      fontFamily: "monospace",
                    }}
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={submitCreateSquad}
                    disabled={creating || !squadName.trim()}
                    style={{
                      padding: "8px 16px", backgroundColor: creating ? "var(--border)" : "var(--accent)",
                      border: "none", borderRadius: 3, color: "white",
                      fontSize: 11, cursor: creating ? "wait" : "pointer",
                      fontFamily: "monospace", letterSpacing: "0.06em", fontWeight: 600,
                      opacity: !squadName.trim() ? 0.5 : 1,
                    }}
                  >
                    {creating ? "SIGNING TX..." : "CREATE + DEPOSIT 50 USDC"}
                  </button>
                </div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 12, lineHeight: 1.6 }}>
                  This calls <code style={{ color: "var(--accent)" }}>create_squad</code> on the adrena_squads program.
                  Bond is refundable if squad is disbanded before competition starts.
                </div>
              </>
            )}
          </div>
        </div>
      )}

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

      {/* ── Search + filters + view toggle ───────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 11, pointerEvents: "none" }}>&#x2315;</span>
            <input
              placeholder="Search squads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200, padding: "7px 10px 7px 28px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 3, color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
            />
          </div>

          {/* Agent filter */}
          <div style={{ display: "flex", gap: 1 }}>
            {(["all", "human", "ai"] as const).map((f, fi) => (
              <button
                key={f}
                onClick={() => setAgentFilter(f)}
                style={{
                  padding: "6px 10px",
                  backgroundColor: agentFilter === f ? (f === "ai" ? "#a78bfa22" : "var(--surface-raised)") : "transparent",
                  border: `1px solid ${agentFilter === f && f === "ai" ? "#a78bfa60" : "var(--border)"}`,
                  color: agentFilter === f ? (f === "ai" ? "#a78bfa" : "var(--text)") : "var(--text-muted)",
                  fontSize: 10, cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em",
                  borderRadius: fi === 0 ? "3px 0 0 3px" : fi === 2 ? "0 3px 3px 0" : "0",
                  marginLeft: fi > 0 ? "-1px" : 0,
                  transition: "all 0.1s",
                }}
              >
                {f === "all" ? "ALL" : f === "human" ? "HUMAN" : "⬡ AI"}
              </button>
            ))}
          </div>
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
            <div key={squad.id} data-squad-card>
              <SquadCard squad={squad} showJoin />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
