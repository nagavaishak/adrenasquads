"use strict";
/**
 * Score calculation engine for Adrena Squads.
 *
 * Member score = (realized_pnl / max_collateral_used) * 10000 (basis points)
 * Squad score  = sum(all member scores, inactive = 0) / total_members
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMemberScore = calculateMemberScore;
exports.calculateSquadScore = calculateSquadScore;
exports.rankSquads = rankSquads;
exports.rankToChampionshipPoints = rankToChampionshipPoints;
/**
 * Calculate a single member's score from their closed trades.
 * score = (sum of realized PnL) / (max collateral used in a single trade) * 10000
 */
function calculateMemberScore(wallet, trades) {
    if (trades.length === 0) {
        return {
            wallet,
            realizedPnl: 0,
            maxCollateralUsed: 0,
            tradeCount: 0,
            score: 0,
        };
    }
    const realizedPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const maxCollateral = Math.max(...trades.map((t) => t.collateral));
    const tradeCount = trades.length;
    const score = maxCollateral > 0
        ? Math.round((realizedPnl / maxCollateral) * 10000)
        : 0;
    return { wallet, realizedPnl, maxCollateralUsed: maxCollateral, tradeCount, score };
}
/**
 * Calculate a squad's aggregate score.
 * Inactive members (0 trades) count as 0, dragging the average down.
 */
function calculateSquadScore(squadId, squadPubkey, memberScores) {
    if (memberScores.length === 0) {
        return { squadId, squadPubkey, memberScores: [], aggregateScore: 0, rank: 0 };
    }
    const totalScore = memberScores.reduce((sum, m) => sum + (m.tradeCount > 0 ? m.score : 0), 0);
    const aggregateScore = Math.round(totalScore / memberScores.length);
    return { squadId, squadPubkey, memberScores, aggregateScore, rank: 0 };
}
/**
 * Rank squads by aggregate score descending. Modifies rank in-place.
 */
function rankSquads(squads) {
    const sorted = [...squads].sort((a, b) => b.aggregateScore - a.aggregateScore);
    sorted.forEach((s, i) => {
        s.rank = i + 1;
    });
    return sorted;
}
/**
 * Map rank to championship points.
 * 1st=100, 2nd=85, 3rd=70, 4th=60, 5th=50, 6th-10th=40-20, 11th+=10
 */
function rankToChampionshipPoints(rank) {
    if (rank === 1)
        return 100;
    if (rank === 2)
        return 85;
    if (rank === 3)
        return 70;
    if (rank === 4)
        return 60;
    if (rank === 5)
        return 50;
    if (rank <= 10)
        return 40 - (rank - 6) * 5; // 40, 35, 30, 25, 20
    return 10;
}
//# sourceMappingURL=calculator.js.map