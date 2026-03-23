import { SquadScore } from '../scoring/calculator.js';
export interface RankedSquad extends SquadScore {
    championshipPoints: number;
    prizeAmount: number;
}
/**
 * Allocate prizes from the prize pool based on squad rank.
 *
 * Distribution:
 *   - 1st: 30% of pool
 *   - 2nd: 15%
 *   - 3rd: 5%
 *   - "Most Improved" (biggest rank jump): 20% — handled separately
 *   - Top individual performer: 15% — handled separately
 *   - Raffle: 15% — handled separately
 */
export declare function allocatePrizes(rankedSquads: SquadScore[], totalPrize: number): RankedSquad[];
/**
 * Identify the "Most Improved" squad — biggest positive rank change from last round.
 */
export declare function findMostImproved(currentRanks: Map<string, number>, previousRanks: Map<string, number>): string | null;
//# sourceMappingURL=ranker.d.ts.map