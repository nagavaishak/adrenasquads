import { SquadScore, rankToChampionshipPoints } from '../scoring/calculator.js';

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
export function allocatePrizes(
  rankedSquads: SquadScore[],
  totalPrize: number,
): RankedSquad[] {
  const allocations: [number, number][] = [
    [1, 0.30],
    [2, 0.15],
    [3, 0.05],
  ];

  return rankedSquads.map((squad) => {
    const allocation = allocations.find(([rank]) => rank === squad.rank);
    const fraction = allocation ? allocation[1] : 0;
    const prizeAmount = Math.floor(totalPrize * fraction);
    const championshipPoints = rankToChampionshipPoints(squad.rank);

    return { ...squad, championshipPoints, prizeAmount };
  });
}

/**
 * Identify the "Most Improved" squad — biggest positive rank change from last round.
 */
export function findMostImproved(
  currentRanks: Map<string, number>,
  previousRanks: Map<string, number>,
): string | null {
  let bestImprovement = 0;
  let bestSquad: string | null = null;

  for (const [squad, currentRank] of currentRanks) {
    const previousRank = previousRanks.get(squad);
    if (previousRank === undefined) continue;

    const improvement = previousRank - currentRank; // positive = moved up
    if (improvement > bestImprovement) {
      bestImprovement = improvement;
      bestSquad = squad;
    }
  }

  return bestSquad;
}
