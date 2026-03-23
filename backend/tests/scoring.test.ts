/**
 * Unit tests for the Adrena Squads scoring engine.
 * Run with: npm test  (from backend/)
 */

import {
  calculateMemberScore,
  calculateSquadScore,
  rankSquads,
  rankToChampionshipPoints,
  ClosedTrade,
  MemberScore,
} from "../src/scoring/calculator";

// ── Fixtures ───────────────────────────────────────────────────────────────

function trade(overrides: Partial<ClosedTrade> = {}): ClosedTrade {
  return {
    signature: "sig_" + Math.random(),
    wallet: "Wallet1111111111111111111111111111111111111",
    pnl: 100,
    collateral: 1000,
    timestamp: 1_700_000_000,
    size: 5000,
    side: "long",
    token: "SOL",
    ...overrides,
  };
}

// ── calculateMemberScore ───────────────────────────────────────────────────

describe("calculateMemberScore", () => {
  const WALLET = "WalletAAAA1111111111111111111111111111111";

  it("returns zero score for empty trade list", () => {
    const result = calculateMemberScore(WALLET, []);
    expect(result.score).toBe(0);
    expect(result.tradeCount).toBe(0);
    expect(result.realizedPnl).toBe(0);
    expect(result.maxCollateralUsed).toBe(0);
    expect(result.wallet).toBe(WALLET);
  });

  it("computes score = (realizedPnl / maxCollateral) * 10000", () => {
    // Single trade: pnl = 200, collateral = 1000 → 200/1000 * 10000 = 2000 bps
    const result = calculateMemberScore(WALLET, [
      trade({ pnl: 200, collateral: 1000 }),
    ]);
    expect(result.score).toBe(2000);
    expect(result.realizedPnl).toBeCloseTo(200);
    expect(result.maxCollateralUsed).toBe(1000);
    expect(result.tradeCount).toBe(1);
  });

  it("uses max single-trade collateral as the denominator", () => {
    // Two trades: pnl 100+50=150, collateral max=2000
    // score = 150/2000 * 10000 = 750
    const result = calculateMemberScore(WALLET, [
      trade({ pnl: 100, collateral: 500 }),
      trade({ pnl: 50, collateral: 2000 }),
    ]);
    expect(result.score).toBe(750);
    expect(result.maxCollateralUsed).toBe(2000);
  });

  it("handles negative PnL (loss)", () => {
    // pnl = -500, collateral = 1000 → -500/1000 * 10000 = -5000
    const result = calculateMemberScore(WALLET, [
      trade({ pnl: -500, collateral: 1000 }),
    ]);
    expect(result.score).toBe(-5000);
    expect(result.realizedPnl).toBeCloseTo(-500);
  });

  it("handles mixed wins and losses", () => {
    // pnl = 300 - 100 = 200, maxCollateral = 2000 → 200/2000 * 10000 = 1000
    const result = calculateMemberScore(WALLET, [
      trade({ pnl: 300, collateral: 1000 }),
      trade({ pnl: -100, collateral: 2000 }),
    ]);
    expect(result.score).toBe(1000);
    expect(result.tradeCount).toBe(2);
  });

  it("returns 0 score when maxCollateral is 0", () => {
    const result = calculateMemberScore(WALLET, [
      trade({ pnl: 100, collateral: 0 }),
    ]);
    expect(result.score).toBe(0);
  });

  it("rounds the score to the nearest integer", () => {
    // pnl = 1, collateral = 3000 → 1/3000 * 10000 = 3.333... → rounds to 3
    const result = calculateMemberScore(WALLET, [
      trade({ pnl: 1, collateral: 3000 }),
    ]);
    expect(Number.isInteger(result.score)).toBe(true);
    expect(result.score).toBe(3);
  });
});

// ── calculateSquadScore ────────────────────────────────────────────────────

describe("calculateSquadScore", () => {
  const SQUAD_ID = 1;
  const SQUAD_PUBKEY = "SquadPDA111111111111111111111111111111111";

  function memberScore(wallet: string, score: number, tradeCount = 3): MemberScore {
    return { wallet, realizedPnl: 0, maxCollateralUsed: 0, tradeCount, score };
  }

  it("returns zero for empty member list", () => {
    const result = calculateSquadScore(SQUAD_ID, SQUAD_PUBKEY, []);
    expect(result.aggregateScore).toBe(0);
    expect(result.rank).toBe(0);
  });

  it("averages member scores across all members", () => {
    // 2 members: scores 3000 + 1000 → avg = 2000
    const result = calculateSquadScore(SQUAD_ID, SQUAD_PUBKEY, [
      memberScore("w1", 3000),
      memberScore("w2", 1000),
    ]);
    expect(result.aggregateScore).toBe(2000);
  });

  it("inactive members (0 trades) count as 0 and drag the average down", () => {
    // 3 members: 3000, 0 (inactive), 0 (inactive) → avg = 3000/3 = 1000
    const result = calculateSquadScore(SQUAD_ID, SQUAD_PUBKEY, [
      memberScore("w1", 3000, 5),
      memberScore("w2", 500, 0), // inactive — score ignored
      memberScore("w3", 800, 0), // inactive — score ignored
    ]);
    expect(result.aggregateScore).toBe(1000);
  });

  it("squad with all-inactive members scores 0", () => {
    const result = calculateSquadScore(SQUAD_ID, SQUAD_PUBKEY, [
      memberScore("w1", 0, 0),
      memberScore("w2", 0, 0),
    ]);
    expect(result.aggregateScore).toBe(0);
  });

  it("single active member propagates score divided by total members", () => {
    // 5-member squad, only 1 active with score 5000 → 5000/5 = 1000
    const members = [
      memberScore("w1", 5000, 10),
      ...["w2", "w3", "w4", "w5"].map((w) => memberScore(w, 0, 0)),
    ];
    const result = calculateSquadScore(SQUAD_ID, SQUAD_PUBKEY, members);
    expect(result.aggregateScore).toBe(1000);
  });

  it("preserves squadId, squadPubkey, and memberScores", () => {
    const members = [memberScore("w1", 2000)];
    const result = calculateSquadScore(SQUAD_ID, SQUAD_PUBKEY, members);
    expect(result.squadId).toBe(SQUAD_ID);
    expect(result.squadPubkey).toBe(SQUAD_PUBKEY);
    expect(result.memberScores).toHaveLength(1);
    expect(result.rank).toBe(0); // rank assigned by rankSquads
  });
});

// ── rankSquads ─────────────────────────────────────────────────────────────

describe("rankSquads", () => {
  function squad(squadId: number, aggregateScore: number) {
    return {
      squadId,
      squadPubkey: `Squad${squadId}`,
      memberScores: [],
      aggregateScore,
      rank: 0,
    };
  }

  it("ranks squads in descending score order", () => {
    const squads = [squad(1, 1000), squad(2, 3000), squad(3, 2000)];
    const ranked = rankSquads(squads);
    expect(ranked[0].squadId).toBe(2); // 3000
    expect(ranked[1].squadId).toBe(3); // 2000
    expect(ranked[2].squadId).toBe(1); // 1000
  });

  it("assigns 1-based ranks", () => {
    const ranked = rankSquads([squad(1, 100), squad(2, 200)]);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
  });

  it("does not mutate the original array order", () => {
    const original = [squad(1, 1000), squad(2, 3000)];
    const ids = original.map((s) => s.squadId);
    rankSquads(original);
    expect(original.map((s) => s.squadId)).toEqual(ids);
  });

  it("handles a single squad", () => {
    const ranked = rankSquads([squad(1, 500)]);
    expect(ranked[0].rank).toBe(1);
  });

  it("handles empty array", () => {
    expect(rankSquads([])).toEqual([]);
  });

  it("handles ties — both get the next sequential rank", () => {
    const ranked = rankSquads([squad(1, 2000), squad(2, 2000), squad(3, 1000)]);
    // Both tied squads get rank 1 and 2 (sort is stable but order between equal is unspecified)
    const ranks = ranked.map((s) => s.rank);
    expect(ranks).toEqual([1, 2, 3]);
  });
});

// ── rankToChampionshipPoints ───────────────────────────────────────────────

describe("rankToChampionshipPoints", () => {
  it("maps top-5 ranks to correct point values", () => {
    expect(rankToChampionshipPoints(1)).toBe(100);
    expect(rankToChampionshipPoints(2)).toBe(85);
    expect(rankToChampionshipPoints(3)).toBe(70);
    expect(rankToChampionshipPoints(4)).toBe(60);
    expect(rankToChampionshipPoints(5)).toBe(50);
  });

  it("maps ranks 6–10 linearly (40, 35, 30, 25, 20)", () => {
    expect(rankToChampionshipPoints(6)).toBe(40);
    expect(rankToChampionshipPoints(7)).toBe(35);
    expect(rankToChampionshipPoints(8)).toBe(30);
    expect(rankToChampionshipPoints(9)).toBe(25);
    expect(rankToChampionshipPoints(10)).toBe(20);
  });

  it("gives 10 points for rank 11+", () => {
    expect(rankToChampionshipPoints(11)).toBe(10);
    expect(rankToChampionshipPoints(50)).toBe(10);
    expect(rankToChampionshipPoints(100)).toBe(10);
  });
});
