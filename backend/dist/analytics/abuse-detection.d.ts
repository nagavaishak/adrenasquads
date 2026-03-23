/**
 * Abuse Detection — Adrena Squads
 *
 * Pure, stateless detection functions for identifying suspicious behaviour
 * during squad competitions.  No DB access — all inputs are passed in,
 * keeping the functions fully unit-testable.
 *
 * Used by: GET /api/admin/abuse-report/:competitionId
 */
export interface Trade {
    signature: string;
    wallet: string;
    pnl: number;
    collateral: number;
    timestamp: number;
    size: number;
    side: 'long' | 'short';
    token: string;
}
export interface Squad {
    pubkey: string;
    name: string;
    members: string[];
}
export interface PredictionEntry {
    wallet: string;
    squad_pubkey: string;
    amount: number;
    placed_at: number;
}
export interface CorrelationResult {
    walletA: string;
    walletB: string;
    correlationScore: number;
    sharedTrades: number;
    flagged: boolean;
}
export interface WashTradingResult {
    wallet: string;
    rapidRoundTrips: number;
    volumePnlRatio: number;
    totalVolume: number;
    totalPnl: number;
    flagged: boolean;
}
export interface InactiveMemberResult {
    wallet: string;
    tradeCount: number;
    lastTradeAt: number | null;
    hoursInactive: number | null;
    flagged: boolean;
}
export interface FrontRunResult {
    wallet: string;
    placedAt: number;
    secondsBeforeLock: number;
    amount: number;
    flagged: boolean;
}
/**
 * detectCorrelatedTrading
 *
 * For every unique pair of squad members, counts how many trades are placed
 * on the same asset within 5 seconds of each other.  If that ratio exceeds
 * 70 % of the smaller member's trade set, the pair is flagged.
 */
export declare function detectCorrelatedTrading(squadMembers: string[], trades: Trade[]): CorrelationResult[];
/**
 * detectWashTrading
 *
 * Flags a wallet if:
 *  (a) It has 3 or more same-token trades within 60 seconds of each other
 *      (rapid round-trips indicating fake volume).
 *  (b) Its volume/|PnL| ratio exceeds 1000× (massive throughput, near-zero net).
 */
export declare function detectWashTrading(wallet: string, trades: Trade[]): WashTradingResult;
/**
 * detectInactiveMembers
 *
 * Flags squad members with zero trades in the current round, or whose most
 * recent trade is more than 48 hours old (padding their squad's score without
 * contributing).
 *
 * @param now  Unix seconds to measure inactivity against (defaults to now).
 */
export declare function detectInactiveMembers(squad: Squad, trades: Map<string, Trade[]>, now?: number): InactiveMemberResult[];
/**
 * detectPredictionFrontRunning
 *
 * Flags predictions placed within 60 seconds before the pool locks.
 * These last-second bets may indicate privileged knowledge of round outcomes.
 *
 * @param poolLockTime  Unix seconds when predictions close.
 */
export declare function detectPredictionFrontRunning(predictions: PredictionEntry[], poolLockTime: number): FrontRunResult[];
//# sourceMappingURL=abuse-detection.d.ts.map