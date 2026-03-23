#!/usr/bin/env ts-node
/**
 * Adrena Squads — Live Scoring Script
 *
 * Fetches real position data for a list of wallets and outputs a formatted
 * squad leaderboard using the Adrena API + Solana RPC transaction history.
 *
 * Usage:
 *   npx ts-node scripts/live-scores.ts \
 *     --wallets WALLET1,WALLET2,WALLET3 \
 *     [--rpc https://api.mainnet-beta.solana.com] \
 *     [--squad "Team Name"] \
 *     [--days 7]
 *
 * Example with real Adrena traders:
 *   npx ts-node scripts/live-scores.ts \
 *     --wallets GZXqnVpZuyKWdUH34mgijxJVM1LEngoGWoJzEXtXGhBb,A7V2... \
 *     --squad "Alpha Wolves" --days 7
 */

import { Connection } from '@solana/web3.js';
import {
  getPositions,
  getLiquidityInfo,
  getPoolStats,
} from '../backend/src/scoring/adrena-client';
import {
  calculateMemberScore,
  calculateSquadScore,
  rankSquads,
} from '../backend/src/scoring/calculator';
import { getClosedTrades } from '../backend/src/scoring/trade-parser';

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
};

const walletsArg = getArg('--wallets');
if (!walletsArg) {
  console.error(
    'Usage: npx ts-node scripts/live-scores.ts --wallets W1,W2,W3 [--squad "Name"] [--days 7] [--rpc <url>]'
  );
  process.exit(1);
}

const wallets    = walletsArg.split(',').map((w) => w.trim()).filter(Boolean);
const squadName  = getArg('--squad') ?? 'Demo Squad';
const daysArg    = getArg('--days');
const days       = daysArg ? parseInt(daysArg, 10) : 7;
const rpcUrl     = getArg('--rpc') ?? process.env.ANCHOR_PROVIDER_URL ?? 'https://api.mainnet-beta.solana.com';

const now       = Math.floor(Date.now() / 1000);
const startTime = now - days * 86_400;
const endTime   = now;

// ── Helpers ──────────────────────────────────────────────────────────────────

function bar(score: number, width = 20): string {
  const pct = Math.min(Math.abs(score) / 5000, 1); // clamp at ±50%
  const filled = Math.round(pct * width);
  const b = '█'.repeat(filled) + '░'.repeat(width - filled);
  return score >= 0 ? `\x1b[32m${b}\x1b[0m` : `\x1b[31m${b}\x1b[0m`;
}

function fmtScore(bps: number): string {
  const sign = bps >= 0 ? '+' : '';
  const pct  = (bps / 100).toFixed(2);
  const color = bps >= 0 ? '\x1b[32m' : '\x1b[31m';
  return `${color}${sign}${pct}%\x1b[0m (${sign}${bps} bps)`;
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function short(wallet: string): string {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const connection = new Connection(rpcUrl, 'confirmed');

  console.log('\n\x1b[1m╔══════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[1m║      ADRENA SQUADS — LIVE SCORE ENGINE       ║\x1b[0m');
  console.log('\x1b[1m╚══════════════════════════════════════════════╝\x1b[0m\n');
  console.log(`Squad:     \x1b[1m${squadName}\x1b[0m`);
  console.log(`Wallets:   ${wallets.length}`);
  console.log(`Window:    last ${days} days  (${new Date(startTime * 1000).toISOString().slice(0, 10)} → ${new Date(endTime * 1000).toISOString().slice(0, 10)})`);
  console.log(`RPC:       ${rpcUrl}\n`);

  // ── 1. Fetch live Adrena pool stats ────────────────────────────────────────
  console.log('\x1b[2m[Adrena API] Fetching pool stats...\x1b[0m');
  try {
    const [poolStats, liquidity] = await Promise.all([
      getPoolStats(),
      getLiquidityInfo(),
    ]);
    console.log(`  Pool AUM:       ${fmtUsd(liquidity.aumUsd)}`);
    console.log(`  24h Volume:     ${fmtUsd(poolStats.volumeUsdc24h)}`);
    console.log(`  24h Fees:       ${fmtUsd(poolStats.feesUsdc24h)}`);
    const solCustody = liquidity.custodies.find((c) => c.symbol === 'SOL');
    if (solCustody) {
      console.log(`  SOL Utiliz.:    ${solCustody.utilizationPct.toFixed(2)}%`);
    }
  } catch (e) {
    console.warn(`  ⚠️  Pool stats unavailable: ${e}`);
  }

  // ── 2. Fetch per-wallet position + trade data ──────────────────────────────
  console.log('\n\x1b[2m[Scoring] Fetching positions and trade history...\x1b[0m');

  const memberScores = [];

  for (const wallet of wallets) {
    process.stdout.write(`  ${short(wallet)}  `);

    // Open positions (unrealizedPnl — live snapshot from Adrena API)
    let openPositions: Awaited<ReturnType<typeof getPositions>> = [];
    try {
      openPositions = await getPositions(wallet);
    } catch (e) {
      // Non-critical: fall back to RPC-only data
      process.stdout.write('\x1b[33m[no open pos]\x1b[0m ');
    }
    const unrealizedPnl = openPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

    // Closed trades (realizedPnl — parsed from RPC transaction history)
    let closedTrades: Awaited<ReturnType<typeof getClosedTrades>> = [];
    try {
      closedTrades = await getClosedTrades(connection, wallet, startTime, endTime);
    } catch (e) {
      process.stdout.write('\x1b[33m[rpc warn]\x1b[0m ');
    }

    const ms = calculateMemberScore(wallet, closedTrades);
    memberScores.push(ms);

    // Display
    const openTag = openPositions.length > 0
      ? `\x1b[36m${openPositions.length} open pos (unreal PnL: ${fmtUsd(unrealizedPnl)})\x1b[0m`
      : '\x1b[2mno open positions\x1b[0m';

    console.log(
      `trades=${ms.tradeCount}  realPnL=${fmtUsd(ms.realizedPnl)}  score=${fmtScore(ms.score)}  ${openTag}`
    );
  }

  // ── 3. Squad score ─────────────────────────────────────────────────────────
  const squadScore = calculateSquadScore(1, squadName, memberScores);

  console.log('\n\x1b[1m── Member Breakdown ────────────────────────────────────────\x1b[0m');
  console.log(`${'WALLET'.padEnd(14)} ${'TRADES'.padEnd(8)} ${'PnL (USD)'.padEnd(12)} ${'SCORE'.padEnd(14)} BAR`);
  console.log('─'.repeat(72));

  for (const m of memberScores) {
    const sign = m.score >= 0 ? '+' : '';
    const pct  = `${sign}${(m.score / 100).toFixed(2)}%`;
    console.log(
      `${short(m.wallet).padEnd(14)} ${String(m.tradeCount).padEnd(8)} ${fmtUsd(m.realizedPnl).padEnd(12)} ${pct.padEnd(14)} ${bar(m.score)}`
    );
  }

  const sign = squadScore.aggregateScore >= 0 ? '+' : '';
  const pct  = `${sign}${(squadScore.aggregateScore / 100).toFixed(2)}%`;
  console.log('─'.repeat(72));
  console.log(`\n\x1b[1mSquad Score:  ${fmtScore(squadScore.aggregateScore)}\x1b[0m`);
  console.log(`Formula:      sum(member_scores, inactive=0) / ${memberScores.length} members = ${pct}`);

  // ── 4. Multi-squad ranking (if multiple squads are provided via comma groups)
  // Single squad mode — show podium preview
  const ranked = rankSquads([squadScore]);
  console.log(`\nRank:  #${ranked[0].rank}`);

  // ── 5. Open position detail ────────────────────────────────────────────────
  const allPositions: Array<{ wallet: string; pos: ReturnType<typeof getPositions> extends Promise<infer U> ? U[number] : never }> = [];
  for (const wallet of wallets) {
    try {
      const positions = await getPositions(wallet);
      for (const p of positions) {
        allPositions.push({ wallet, pos: p });
      }
    } catch (_) {
      // best-effort
    }
  }

  if (allPositions.length > 0) {
    console.log('\n\x1b[1m── Open Positions (live from Adrena) ──────────────────────\x1b[0m');
    console.log(`${'WALLET'.padEnd(14)} ${'SIDE'.padEnd(6)} ${'TOKEN'.padEnd(8)} ${'SIZE (USD)'.padEnd(14)} ${'ENTRY'.padEnd(10)} UNREAL PnL`);
    console.log('─'.repeat(72));
    for (const { wallet, pos } of allPositions) {
      const unreal = pos.unrealizedPnl >= 0
        ? `\x1b[32m+${pos.unrealizedPnl.toFixed(2)}\x1b[0m`
        : `\x1b[31m${pos.unrealizedPnl.toFixed(2)}\x1b[0m`;
      const side = pos.side === 'long' ? '\x1b[32mLONG\x1b[0m ' : '\x1b[31mSHORT\x1b[0m';
      console.log(
        `${short(wallet).padEnd(14)} ${side} ${pos.token.padEnd(8)} ${fmtUsd(pos.sizeUsd).padEnd(14)} ${fmtUsd(pos.entryPrice).padEnd(10)} ${unreal}`
      );
    }
  }

  console.log('\n\x1b[2m────────────────────────────────────────────────────────────\x1b[0m');
  console.log(`\x1b[2mData sources: Adrena API (datapi.adrena.trade) + Solana RPC (${rpcUrl.slice(0, 40)})\x1b[0m`);
  console.log(`\x1b[2mProgram ID:   13gDzEXCdocbj8iAiqrScGo47NiSuYENGsRqi3SEAwet\x1b[0m\n`);
}

main().catch((err) => {
  console.error('\x1b[31mFatal:\x1b[0m', err);
  process.exit(1);
});
