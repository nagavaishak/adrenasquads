"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CorrelationResult {
  walletA: string;
  walletB: string;
  correlationScore: number;
  sharedTrades: number;
  flagged: boolean;
}

interface WashTradingResult {
  wallet: string;
  rapidRoundTrips: number;
  volumePnlRatio: number;
  totalVolume: number;
  totalPnl: number;
  flagged: boolean;
}

interface InactiveMemberResult {
  wallet: string;
  tradeCount: number;
  lastTradeAt: number | null;
  hoursInactive: number | null;
  flagged: boolean;
}

interface FrontRunResult {
  wallet: string;
  placedAt: number;
  secondsBeforeLock: number;
  amount: number;
  flagged: boolean;
}

interface AbuseReport {
  competition_id: number;
  competition_status: string;
  generated_at: string;
  total_squads: number;
  total_traders: number;
  flagged_wallets: number;
  risk_score: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  correlated_trading: CorrelationResult[];
  wash_trading: WashTradingResult[];
  inactive_members: InactiveMemberResult[];
  prediction_frontrunning: FrontRunResult[];
}

// ── Demo fallback data ────────────────────────────────────────────────────────

function getDemoReport(competitionId: number): AbuseReport {
  const now = Math.floor(Date.now() / 1000);
  return {
    competition_id: competitionId,
    competition_status: "Active",
    generated_at: new Date().toISOString(),
    total_squads: 8,
    total_traders: 32,
    flagged_wallets: 5,
    risk_score: "MEDIUM",
    summary: "2 potential wash traders, 1 correlated pair, 3 inactive members flagged",
    correlated_trading: [
      {
        walletA: "GZXqnVpZuyKWdUH34mgijxJVM1LEngoGWoJzEXtXGhBb",
        walletB: "9xKq4mRzLcpX7YNHE8ZvwDpFb2mQrTs3uWjVeA6CkNd",
        correlationScore: 0.82,
        sharedTrades: 9,
        flagged: true,
      },
    ],
    wash_trading: [
      {
        wallet: "3pLw7nBfQdVkAm9sHzXoRcEyTb1JuWiN4MqKj6tFgPe",
        rapidRoundTrips: 7,
        volumePnlRatio: 2340,
        totalVolume: 468000,
        totalPnl: 200,
        flagged: true,
      },
      {
        wallet: "5tHj2cDkRmXwPvN8LqAoYbEsUi3FgZCe7JnKd1WrTpQ",
        rapidRoundTrips: 4,
        volumePnlRatio: 1820,
        totalVolume: 218400,
        totalPnl: 120,
        flagged: true,
      },
    ],
    inactive_members: [
      { wallet: "Vy4mNpQsLcZoRdAk8XbHuEiT2WgJnFe3KjYw7CvPt1M", tradeCount: 0,  lastTradeAt: null,            hoursInactive: null, flagged: true },
      { wallet: "BzKe6rTwAmXcNsPdFiLqUj9YhGo4VbCt7WnRk2EjMvD", tradeCount: 1,  lastTradeAt: now - 54 * 3600, hoursInactive: 54,   flagged: true },
      { wallet: "DxPf8sNbKoYuWqAcLmHvRj3ZeGi5TnCw6FtBk1EoMrX", tradeCount: 0,  lastTradeAt: null,            hoursInactive: null, flagged: true },
    ],
    prediction_frontrunning: [
      {
        wallet: "HmQn7vKpLcXsAoBf4ZdRiEuT9WjYgCe2NkMw3FtJrPb",
        placedAt: now - 3 * 3600 - 45,
        secondsBeforeLock: 45,
        amount: 500,
        flagged: true,
      },
    ],
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function short(wallet: string) {
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function formatUSD(n: number) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function timeSince(unix: number | null) {
  if (unix === null) return "never";
  const hours = Math.floor((Date.now() / 1000 - unix) / 3600);
  if (hours < 1) return "< 1 h ago";
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

const RISK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  LOW:    { bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.3)",  text: "#22c55e" },
  MEDIUM: { bg: "rgba(234,179,8,0.08)",  border: "rgba(234,179,8,0.3)",  text: "#eab308" },
  HIGH:   { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.35)", text: "#ef4444" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  flagCount,
  children,
  empty,
}: {
  title: string;
  flagCount: number;
  children: React.ReactNode;
  empty: string;
}) {
  const hasFlags = flagCount > 0;
  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: `1px solid ${hasFlags ? "rgba(239,68,68,0.2)" : "var(--border)"}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: hasFlags ? "rgba(239,68,68,0.04)" : "transparent",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text)" }}>
          {title}
        </span>
        {hasFlags ? (
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 3,
              backgroundColor: "rgba(239,68,68,0.12)",
              color: "#ef4444",
              letterSpacing: "0.05em",
            }}
          >
            {flagCount} FLAG{flagCount > 1 ? "S" : ""}
          </span>
        ) : (
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 3,
              backgroundColor: "rgba(34,197,94,0.1)",
              color: "#22c55e",
              letterSpacing: "0.05em",
            }}
          >
            CLEAN
          </span>
        )}
      </div>
      {hasFlags ? children : (
        <div style={{ padding: "20px 16px", color: "var(--text-muted)", fontSize: 11, textAlign: "center" }}>
          {empty}
        </div>
      )}
    </div>
  );
}

function FlagRow({ children, severity = "high" }: { children: React.ReactNode; severity?: "high" | "medium" }) {
  return (
    <tr
      style={{
        backgroundColor: severity === "high"
          ? "rgba(239,68,68,0.05)"
          : "rgba(234,179,8,0.04)",
      }}
    >
      {children}
    </tr>
  );
}

// ── Password gate ─────────────────────────────────────────────────────────────

function PasswordGate({ onAuth }: { onAuth: (key: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "var(--bg)",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "32px 40px",
          width: 360,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: "var(--accent-dim)",
            border: "1px solid rgba(249,115,22,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="3" y="8" width="12" height="8" rx="1.5" stroke="#f97316" strokeWidth="1.4"/>
            <path d="M6 8V5.5a3 3 0 0 1 6 0V8" stroke="#f97316" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="9" cy="12" r="1.2" fill="#f97316"/>
          </svg>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
          ADMIN ACCESS
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 24 }}>
          Competition Health Monitor
        </div>
        <input
          type="password"
          placeholder="Enter admin key"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && value && onAuth(value)}
          style={{
            width: "100%",
            backgroundColor: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "8px 12px",
            fontSize: 12,
            color: "var(--text)",
            outline: "none",
            marginBottom: 12,
            fontFamily: "var(--font-mono)",
          }}
        />
        <button
          onClick={() => value && onAuth(value)}
          style={{
            width: "100%",
            backgroundColor: "var(--accent)",
            color: "white",
            border: "none",
            borderRadius: 4,
            padding: "9px 0",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.08em",
            fontFamily: "var(--font-mono)",
          }}
        >
          AUTHENTICATE
        </button>
        <div style={{ marginTop: 12, fontSize: 10, color: "var(--text-muted)" }}>
          Key is stored in localStorage — demo auth only
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [adminKey, setAdminKey]           = useState("");
  const [report, setReport]               = useState<AbuseReport | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [competitionId, setCompetitionId] = useState("1");
  const [demoMode, setDemoMode]           = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("admin_key");
    if (stored) {
      setAdminKey(stored);
      setAuthenticated(true);
    }
  }, []);

  function handleAuth(key: string) {
    localStorage.setItem("admin_key", key);
    setAdminKey(key);
    setAuthenticated(true);
  }

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDemoMode(false);
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${BASE}/api/admin/abuse-report/${competitionId}`, {
        headers: { "X-Admin-Key": adminKey },
      });
      if (res.status === 401) {
        setError("Invalid admin key");
        localStorage.removeItem("admin_key");
        setAuthenticated(false);
        return;
      }
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      if (json.note === "demo-mode") setDemoMode(true);
      setReport(json.data as AbuseReport);
    } catch {
      setReport(getDemoReport(Number(competitionId)));
      setDemoMode(true);
    } finally {
      setLoading(false);
    }
  }, [adminKey, competitionId]);

  // Auto-fetch once authenticated
  useEffect(() => {
    if (authenticated) fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  if (!authenticated) {
    return <PasswordGate onAuth={handleAuth} />;
  }

  const risk = report?.risk_score ?? "LOW";
  const rc   = RISK_COLORS[risk];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
      <div className="page-container" style={{ maxWidth: 1100, paddingBottom: 64 }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 28,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L2 6v6l7 4 7-4V6L9 2z" stroke="var(--accent)" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
                <line x1="9" y1="2" x2="9" y2="16" stroke="var(--accent)" strokeWidth="1.3" opacity="0.4"/>
                <line x1="2" y1="6" x2="16" y2="6" stroke="var(--accent)" strokeWidth="1.3" opacity="0.4"/>
              </svg>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "0.02em" }}>
                COMPETITION HEALTH MONITOR
              </h1>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Abuse detection analytics · Competition #{competitionId}
              {demoMode && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 9,
                    padding: "1px 6px",
                    borderRadius: 2,
                    backgroundColor: "rgba(249,115,22,0.12)",
                    color: "var(--accent)",
                    letterSpacing: "0.08em",
                  }}
                >
                  DEMO DATA
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              value={competitionId}
              onChange={e => setCompetitionId(e.target.value)}
              placeholder="Competition ID"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "7px 10px",
                fontSize: 11,
                color: "var(--text)",
                width: 120,
                fontFamily: "var(--font-mono)",
                outline: "none",
              }}
            />
            <button
              onClick={fetchReport}
              disabled={loading}
              style={{
                backgroundColor: loading ? "var(--surface-raised)" : "var(--accent)",
                color: loading ? "var(--text-muted)" : "white",
                border: "none",
                borderRadius: 4,
                padding: "7px 16px",
                fontSize: 11,
                fontWeight: 600,
                cursor: loading ? "default" : "pointer",
                letterSpacing: "0.06em",
                fontFamily: "var(--font-mono)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "background 0.15s",
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      border: "1.5px solid var(--text-muted)",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  ANALYZING...
                </>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M8.5 5A3.5 3.5 0 1 1 5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <polyline points="5,1.5 7,1.5 7,3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  REFRESH ANALYSIS
                </>
              )}
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("admin_key");
                setAuthenticated(false);
                setReport(null);
              }}
              title="Sign out"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "7px 10px",
                fontSize: 11,
                color: "var(--text-muted)",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "var(--danger-dim)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 4,
              fontSize: 11,
              color: "#ef4444",
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {report && (
          <>
            {/* ── Summary stats ───────────────────────────────────────────── */}
            <div className="stats-grid-admin" style={{ gap: 12, marginBottom: 24 }}>
              {[
                { label: "TOTAL SQUADS",    value: report.total_squads,   color: "var(--text)" },
                { label: "ACTIVE TRADERS",  value: report.total_traders,  color: "var(--text)" },
                { label: "FLAGGED WALLETS", value: report.flagged_wallets, color: report.flagged_wallets > 0 ? "#ef4444" : "#22c55e" },
                { label: "RISK LEVEL",      value: report.risk_score,     color: rc.text },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "16px",
                  }}
                >
                  <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 8 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Risk badge + summary ─────────────────────────────────────── */}
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: rc.bg,
                border: `1px solid ${rc.border}`,
                borderRadius: 6,
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 3,
                  backgroundColor: rc.bg,
                  border: `1px solid ${rc.border}`,
                  color: rc.text,
                  letterSpacing: "0.08em",
                  flexShrink: 0,
                }}
              >
                {risk} RISK
              </span>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                {report.summary}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
                Generated {new Date(report.generated_at).toLocaleTimeString()}
              </span>
            </div>

            {/* ── Detection sections ───────────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Correlated Trading */}
              <SectionCard
                title="CORRELATED TRADING"
                flagCount={report.correlated_trading.length}
                empty="No correlated trading pairs detected this round."
              >
                <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>WALLET A</th>
                      <th>WALLET B</th>
                      <th>CORRELATION</th>
                      <th>SHARED TRADES</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.correlated_trading.map((row, i) => (
                      <FlagRow key={i} severity={row.correlationScore > 0.85 ? "high" : "medium"}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{short(row.walletA)}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{short(row.walletB)}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                width: 60,
                                height: 4,
                                backgroundColor: "var(--surface-raised)",
                                borderRadius: 2,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${row.correlationScore * 100}%`,
                                  height: "100%",
                                  backgroundColor: row.correlationScore > 0.85 ? "#ef4444" : "#eab308",
                                  borderRadius: 2,
                                }}
                              />
                            </div>
                            <span style={{ fontSize: 11, color: row.correlationScore > 0.85 ? "#ef4444" : "#eab308" }}>
                              {(row.correlationScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: 11 }}>{row.sharedTrades}</td>
                        <td>
                          <span
                            style={{
                              fontSize: 9,
                              padding: "2px 7px",
                              borderRadius: 2,
                              backgroundColor: "rgba(239,68,68,0.12)",
                              color: "#ef4444",
                              letterSpacing: "0.06em",
                            }}
                          >
                            FLAGGED
                          </span>
                        </td>
                      </FlagRow>
                    ))}
                  </tbody>
                </table>
                </div>
              </SectionCard>

              {/* Wash Trading */}
              <SectionCard
                title="WASH TRADING"
                flagCount={report.wash_trading.length}
                empty="No wash trading activity detected this round."
              >
                <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>WALLET</th>
                      <th>ROUND TRIPS</th>
                      <th>VOL / PNL RATIO</th>
                      <th>TOTAL VOLUME</th>
                      <th>NET PNL</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.wash_trading.map((row, i) => (
                      <FlagRow key={i} severity={row.volumePnlRatio > 2000 ? "high" : "medium"}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{short(row.wallet)}</td>
                        <td>
                          <span
                            style={{
                              color: row.rapidRoundTrips >= 5 ? "#ef4444" : "#eab308",
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            {row.rapidRoundTrips}×
                          </span>
                        </td>
                        <td>
                          <span style={{ color: "#ef4444", fontWeight: 600, fontSize: 11 }}>
                            {row.volumePnlRatio.toLocaleString("en-US", { maximumFractionDigits: 0 })}×
                          </span>
                        </td>
                        <td style={{ fontSize: 11 }}>{formatUSD(row.totalVolume)}</td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              color: row.totalPnl >= 0 ? "var(--success)" : "var(--danger)",
                            }}
                          >
                            {row.totalPnl >= 0 ? "+" : ""}
                            {formatUSD(row.totalPnl)}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 9,
                              padding: "2px 7px",
                              borderRadius: 2,
                              backgroundColor: "rgba(239,68,68,0.12)",
                              color: "#ef4444",
                              letterSpacing: "0.06em",
                            }}
                          >
                            FLAGGED
                          </span>
                        </td>
                      </FlagRow>
                    ))}
                  </tbody>
                </table>
                </div>
              </SectionCard>

              {/* Inactive Members */}
              <SectionCard
                title="INACTIVE MEMBERS"
                flagCount={report.inactive_members.length}
                empty="All squad members have traded within the last 48 hours."
              >
                <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>WALLET</th>
                      <th>TRADES THIS ROUND</th>
                      <th>LAST TRADE</th>
                      <th>HOURS INACTIVE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.inactive_members.map((row, i) => (
                      <FlagRow key={i} severity={row.tradeCount === 0 ? "high" : "medium"}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{short(row.wallet)}</td>
                        <td>
                          <span style={{ color: row.tradeCount === 0 ? "#ef4444" : "var(--text)", fontWeight: row.tradeCount === 0 ? 600 : 400 }}>
                            {row.tradeCount}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: "var(--text-dim)" }}>
                          {timeSince(row.lastTradeAt)}
                        </td>
                        <td>
                          {row.hoursInactive !== null ? (
                            <span style={{ color: row.hoursInactive > 72 ? "#ef4444" : "#eab308", fontSize: 11 }}>
                              {row.hoursInactive.toFixed(0)} h
                            </span>
                          ) : (
                            <span style={{ color: "#ef4444", fontSize: 11 }}>—</span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 9,
                              padding: "2px 7px",
                              borderRadius: 2,
                              backgroundColor: row.tradeCount === 0
                                ? "rgba(239,68,68,0.12)"
                                : "rgba(234,179,8,0.1)",
                              color: row.tradeCount === 0 ? "#ef4444" : "#eab308",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {row.tradeCount === 0 ? "NO TRADES" : "IDLE >48H"}
                          </span>
                        </td>
                      </FlagRow>
                    ))}
                  </tbody>
                </table>
                </div>
              </SectionCard>

              {/* Prediction Front-Running */}
              <SectionCard
                title="PREDICTION FRONT-RUNNING"
                flagCount={report.prediction_frontrunning.length}
                empty="No last-minute predictions detected before pool lock."
              >
                <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>WALLET</th>
                      <th>PLACED AT</th>
                      <th>SECONDS BEFORE LOCK</th>
                      <th>AMOUNT STAKED</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.prediction_frontrunning.map((row, i) => (
                      <FlagRow key={i} severity={row.secondsBeforeLock < 30 ? "high" : "medium"}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{short(row.wallet)}</td>
                        <td style={{ fontSize: 11, color: "var(--text-dim)" }}>
                          {new Date(row.placedAt * 1000).toLocaleTimeString()}
                        </td>
                        <td>
                          <span style={{ color: row.secondsBeforeLock < 30 ? "#ef4444" : "#eab308", fontWeight: 600, fontSize: 12 }}>
                            {row.secondsBeforeLock}s
                          </span>
                        </td>
                        <td style={{ fontSize: 11 }}>{formatUSD(row.amount)}</td>
                        <td>
                          <span
                            style={{
                              fontSize: 9,
                              padding: "2px 7px",
                              borderRadius: 2,
                              backgroundColor: "rgba(239,68,68,0.12)",
                              color: "#ef4444",
                              letterSpacing: "0.06em",
                            }}
                          >
                            FRONT-RUN
                          </span>
                        </td>
                      </FlagRow>
                    ))}
                  </tbody>
                </table>
                </div>
              </SectionCard>

            </div>
          </>
        )}

        {!report && !loading && (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 12,
              padding: "60px 0",
            }}
          >
            Click &ldquo;Refresh Analysis&rdquo; to run abuse detection.
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
