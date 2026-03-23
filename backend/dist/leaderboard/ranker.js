"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allocatePrizes = allocatePrizes;
exports.findMostImproved = findMostImproved;
const calculator_js_1 = require("../scoring/calculator.js");
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
function allocatePrizes(rankedSquads, totalPrize) {
    const allocations = [
        [1, 0.30],
        [2, 0.15],
        [3, 0.05],
    ];
    return rankedSquads.map((squad) => {
        const allocation = allocations.find(([rank]) => rank === squad.rank);
        const fraction = allocation ? allocation[1] : 0;
        const prizeAmount = Math.floor(totalPrize * fraction);
        const championshipPoints = (0, calculator_js_1.rankToChampionshipPoints)(squad.rank);
        return { ...squad, championshipPoints, prizeAmount };
    });
}
/**
 * Identify the "Most Improved" squad — biggest positive rank change from last round.
 */
function findMostImproved(currentRanks, previousRanks) {
    let bestImprovement = 0;
    let bestSquad = null;
    for (const [squad, currentRank] of currentRanks) {
        const previousRank = previousRanks.get(squad);
        if (previousRank === undefined)
            continue;
        const improvement = previousRank - currentRank; // positive = moved up
        if (improvement > bestImprovement) {
            bestImprovement = improvement;
            bestSquad = squad;
        }
    }
    return bestSquad;
}
//# sourceMappingURL=ranker.js.map