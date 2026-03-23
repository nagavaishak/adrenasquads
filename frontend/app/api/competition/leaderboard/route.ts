import { NextResponse } from "next/server";
import { DEMO_LEADERBOARD } from "@/lib/demo-data";

const ADRENA_API = "https://datapi.adrena.trade";

// Known active Adrena traders to score (public devnet demo wallets)
// In production these come from registered SquadEntry accounts on-chain
const DEMO_WALLETS = [
  "GZXqnVpZuyKWdUH34mgijxJVM1LEngoGWoJzEXtXGhBb",
  "9xKq4mRzLcpX7YNHE8ZvwDpFb2mQrTs3uWjVeA6CkNd",
  "3pLw7nBfQdVkAm9sHzXoRcEyTb1JuWiN4MqKj6tFgPe",
  "5tHj2cDkRmXwPvN8LqAoYbEsUi3FgZCe7JnKd1WrTpQ",
];

interface AdrenaPosition {
  owner: string;
  sizeUsd: string;
  collateralUsd: string;
  unrealizedPnl: string;
  side: string;
  token: string;
}

function fromFixed6(v: string | number): number {
  return Number(v) / 1_000_000;
}

/** Normalized score: (unrealized_pnl / collateral) * 10000 basis points */
function calcScore(positions: AdrenaPosition[]): number {
  if (!positions.length) return 0;
  let totalPnl = 0;
  let totalCollateral = 0;
  for (const p of positions) {
    totalPnl += fromFixed6(p.unrealizedPnl);
    totalCollateral += fromFixed6(p.collateralUsd);
  }
  if (totalCollateral === 0) return 0;
  return Math.round((totalPnl / totalCollateral) * 10_000);
}

async function fetchPositions(wallet: string): Promise<AdrenaPosition[]> {
  try {
    const res = await fetch(
      `${ADRENA_API}/get-positions?account=${wallet}`,
      { signal: AbortSignal.timeout(6_000) }
    );
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) return [];
    return json.data as AdrenaPosition[];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    // Fetch live positions for all demo wallets in parallel
    const results = await Promise.all(
      DEMO_WALLETS.map(async (wallet, i) => {
        const positions = await fetchPositions(wallet);
        const score = calcScore(positions);
        const openPositions = positions.length;
        const totalSize = positions.reduce((s, p) => s + fromFixed6(p.sizeUsd), 0);
        return {
          wallet,
          score,
          openPositions,
          totalSizeUsd: totalSize,
          squadIndex: Math.floor(i / 2), // group into squads of 2 for demo
        };
      })
    );

    // Check if we got any real data
    const hasRealData = results.some(r => r.openPositions > 0 || r.score !== 0);

    if (hasRealData) {
      // Group into squads
      const squad0 = results.filter(r => r.squadIndex === 0);
      const squad1 = results.filter(r => r.squadIndex === 1);

      const squads = [
        { name: "Alpha Wolves",    members: squad0 },
        { name: "Basis Hunters",   members: squad1 },
      ].map((s, i) => ({
        rank: 0,
        squad_pubkey: `live_squad_${i}`,
        squad_name: s.name,
        leader_pubkey: s.members[0]?.wallet ?? "",
        aggregate_score: s.members.reduce((sum, m) => sum + m.score, 0),
        prize_amount: 0,
        member_count: s.members.length,
        member_scores: s.members.map(m => ({
          wallet: m.wallet,
          score: m.score,
          realized_pnl: (m.score / 100).toFixed(2),
          trade_count: m.openPositions,
        })),
      }))
        .sort((a, b) => b.aggregate_score - a.aggregate_score)
        .map((s, i) => ({ ...s, rank: i + 1 }));

      return NextResponse.json({
        success: true,
        data: squads,
        source: "adrena-live",
        note: "Scores computed from live Adrena positions via datapi.adrena.trade",
      });
    }
  } catch {
    // fall through to demo
  }

  // Fallback: demo data (used when wallets have no open positions)
  return NextResponse.json({
    success: true,
    data: DEMO_LEADERBOARD,
    source: "demo",
  });
}
