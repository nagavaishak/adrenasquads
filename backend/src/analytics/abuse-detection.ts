/**
 * Abuse Detection — Adrena Squads
 *
 * Pure, stateless detection functions for identifying suspicious behaviour
 * during squad competitions.  No DB access — all inputs are passed in,
 * keeping the functions fully unit-testable.
 *
 * Used by: GET /api/admin/abuse-report/:competitionId
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Trade {
  signature: string;
  wallet:    string;
  pnl:       number;   // USD realized P&L (can be negative)
  collateral: number;  // USD collateral used
  timestamp: number;   // unix seconds (close time)
  size:      number;   // USD notional size
  side:      'long' | 'short';
  token:     string;   // e.g. 'SOL', 'BTC', 'ETH'
}

export interface Squad {
  pubkey:  string;
  name:    string;
  members: string[];   // wallet addresses
}

export interface PredictionEntry {
  wallet:       string;
  squad_pubkey: string;
  amount:       number;  // USDC
  placed_at:    number;  // unix seconds
}

// ── Result types ──────────────────────────────────────────────────────────────

export interface CorrelationResult {
  walletA:          string;
  walletB:          string;
  correlationScore: number;  // 0.0 – 1.0
  sharedTrades:     number;  // count of matched (within 5s, same token) pairs
  flagged:          boolean;
}

export interface WashTradingResult {
  wallet:          string;
  rapidRoundTrips: number;  // same-token trades within 60 s of each other
  volumePnlRatio:  number;  // abs(totalSize) / abs(totalPnl)
  totalVolume:     number;  // USD
  totalPnl:        number;  // USD
  flagged:         boolean;
}

export interface InactiveMemberResult {
  wallet:         string;
  tradeCount:     number;
  lastTradeAt:    number | null;  // unix seconds; null if no trades
  hoursInactive:  number | null;
  flagged:        boolean;
}

export interface FrontRunResult {
  wallet:             string;
  placedAt:           number;  // unix seconds
  secondsBeforeLock:  number;
  amount:             number;  // USDC staked
  flagged:            boolean;
}

// ── Detection functions ───────────────────────────────────────────────────────

/**
 * detectCorrelatedTrading
 *
 * For every unique pair of squad members, counts how many trades are placed
 * on the same asset within 5 seconds of each other.  If that ratio exceeds
 * 70 % of the smaller member's trade set, the pair is flagged.
 */
export function detectCorrelatedTrading(
  squadMembers: string[],
  trades: Trade[],
): CorrelationResult[] {
  // Group trades by wallet
  const byWallet = new Map<string, Trade[]>();
  for (const t of trades) {
    const arr = byWallet.get(t.wallet) ?? [];
    arr.push(t);
    byWallet.set(t.wallet, arr);
  }

  const results: CorrelationResult[] = [];

  for (let i = 0; i < squadMembers.length; i++) {
    for (let j = i + 1; j < squadMembers.length; j++) {
      const walletA  = squadMembers[i];
      const walletB  = squadMembers[j];
      const tradesA  = byWallet.get(walletA) ?? [];
      const tradesB  = byWallet.get(walletB) ?? [];

      if (tradesA.length === 0 || tradesB.length === 0) {
        results.push({ walletA, walletB, correlationScore: 0, sharedTrades: 0, flagged: false });
        continue;
      }

      // Count pairs: same token, timestamps within 5 seconds
      let sharedTrades = 0;
      for (const ta of tradesA) {
        for (const tb of tradesB) {
          if (ta.token === tb.token && Math.abs(ta.timestamp - tb.timestamp) <= 5) {
            sharedTrades++;
            break; // count each trade of A at most once
          }
        }
      }

      const basis           = Math.min(tradesA.length, tradesB.length);
      const correlationScore = basis > 0 ? sharedTrades / basis : 0;

      results.push({
        walletA,
        walletB,
        correlationScore,
        sharedTrades,
        flagged: correlationScore > 0.7,
      });
    }
  }

  return results;
}

/**
 * detectWashTrading
 *
 * Flags a wallet if:
 *  (a) It has 3 or more same-token trades within 60 seconds of each other
 *      (rapid round-trips indicating fake volume).
 *  (b) Its volume/|PnL| ratio exceeds 1000× (massive throughput, near-zero net).
 */
export function detectWashTrading(wallet: string, trades: Trade[]): WashTradingResult {
  const walletTrades = trades.filter(t => t.wallet === wallet);

  if (walletTrades.length === 0) {
    return { wallet, rapidRoundTrips: 0, volumePnlRatio: 0, totalVolume: 0, totalPnl: 0, flagged: false };
  }

  // Sort ascending by close timestamp
  const sorted = [...walletTrades].sort((a, b) => a.timestamp - b.timestamp);

  // Count rapid round trips: any pair of same-token trades within 60 seconds
  let rapidRoundTrips = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].timestamp - sorted[i].timestamp > 60) break;
      if (sorted[i].token === sorted[j].token) {
        rapidRoundTrips++;
        break;
      }
    }
  }

  const totalVolume      = walletTrades.reduce((s, t) => s + Math.abs(t.size), 0);
  const totalPnl         = walletTrades.reduce((s, t) => s + t.pnl, 0);
  const absPnl           = Math.abs(totalPnl);
  const volumePnlRatio   = absPnl < 0.01 ? 99999 : totalVolume / absPnl;

  const flagged = rapidRoundTrips >= 3 || volumePnlRatio > 1000;

  return { wallet, rapidRoundTrips, volumePnlRatio, totalVolume, totalPnl, flagged };
}

/**
 * detectInactiveMembers
 *
 * Flags squad members with zero trades in the current round, or whose most
 * recent trade is more than 48 hours old (padding their squad's score without
 * contributing).
 *
 * @param now  Unix seconds to measure inactivity against (defaults to now).
 */
export function detectInactiveMembers(
  squad: Squad,
  trades: Map<string, Trade[]>,
  now: number = Math.floor(Date.now() / 1000),
): InactiveMemberResult[] {
  return squad.members.map(wallet => {
    const memberTrades  = trades.get(wallet) ?? [];
    const tradeCount    = memberTrades.length;
    const lastTradeAt   = tradeCount > 0
      ? Math.max(...memberTrades.map(t => t.timestamp))
      : null;
    const hoursInactive = lastTradeAt !== null
      ? (now - lastTradeAt) / 3600
      : null;

    const flagged =
      tradeCount === 0 ||
      (hoursInactive !== null && hoursInactive > 48);

    return { wallet, tradeCount, lastTradeAt, hoursInactive, flagged };
  });
}

/**
 * detectPredictionFrontRunning
 *
 * Flags predictions placed within 60 seconds before the pool locks.
 * These last-second bets may indicate privileged knowledge of round outcomes.
 *
 * @param poolLockTime  Unix seconds when predictions close.
 */
export function detectPredictionFrontRunning(
  predictions: PredictionEntry[],
  poolLockTime: number,
): FrontRunResult[] {
  return predictions
    .filter(p => p.placed_at < poolLockTime)
    .map(p => {
      const secondsBeforeLock = poolLockTime - p.placed_at;
      return {
        wallet:            p.wallet,
        placedAt:          p.placed_at,
        secondsBeforeLock,
        amount:            p.amount,
        flagged:           secondsBeforeLock <= 60,
      };
    });
}
