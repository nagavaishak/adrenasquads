/**
 * Score calculation engine for Adrena Squads.
 *
 * Member score = (realized_pnl / max_collateral_used) * 10000 (basis points)
 * Squad score  = sum(all member scores, inactive = 0) / total_members
 */
export interface ClosedTrade {
    signature: string;
    wallet: string;
    pnl: number;
    collateral: number;
    timestamp: number;
    size: number;
    side: 'long' | 'short';
    token: string;
}
export interface MemberScore {
    wallet: string;
    realizedPnl: number;
    maxCollateralUsed: number;
    tradeCount: number;
    /** Percentage return in basis points. 0 if no trades. */
    score: number;
}
export interface SquadScore {
    squadId: number;
    squadPubkey: string;
    memberScores: MemberScore[];
    /** Mean of all member scores (inactive count as 0) */
    aggregateScore: number;
    rank: number;
}
/**
 * Calculate a single member's score from their closed trades.
 * score = (sum of realized PnL) / (max collateral used in a single trade) * 10000
 */
export declare function calculateMemberScore(wallet: string, trades: ClosedTrade[]): MemberScore;
/**
 * Calculate a squad's aggregate score.
 * Inactive members (0 trades) count as 0, dragging the average down.
 */
export declare function calculateSquadScore(squadId: number, squadPubkey: string, memberScores: MemberScore[]): SquadScore;
/**
 * Rank squads by aggregate score descending. Modifies rank in-place.
 */
export declare function rankSquads(squads: SquadScore[]): SquadScore[];
/**
 * Map rank to championship points.
 * 1st=100, 2nd=85, 3rd=70, 4th=60, 5th=50, 6th-10th=40-20, 11th+=10
 */
export declare function rankToChampionshipPoints(rank: number): number;
//# sourceMappingURL=calculator.d.ts.map