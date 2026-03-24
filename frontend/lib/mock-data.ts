export interface Squad {
  id: number;
  pubkey: string;
  name: string;
  leader: string;
  members: string[];
  memberCount: number;
  inviteOnly: boolean;
  aggregateScore: number; // basis points
  rank: number;
  prevRank: number;
  prizeAmount: number;
  roundHistory: number[]; // scores per round
  isAgent?: boolean; // true if squad includes AI trading agents
  strategy?: {
    leverage: number;      // 0-1: avg leverage intensity
    directionBias: number; // 0-1: 0=short-biased, 0.5=neutral, 1=long-biased
    holdDuration: number;  // 0-1: 0=scalper, 1=swing
    winRate: number;       // 0-1
    diversification: number; // 0-1: 0=single-asset, 1=multi-asset
    riskAppetite: number;  // 0-1: 0=conservative, 1=aggressive
  };
}

export interface Competition {
  id: number;
  pubkey: string;
  seasonId: number;
  roundNumber: number;
  startTime: number; // unix
  endTime: number;   // unix
  totalPrize: number; // USDC
  totalSquads: number;
  status: "Registration" | "Active" | "Calculating" | "Finalized";
}

export interface PredictionEntry {
  squadPubkey: string;
  squadName: string;
  totalStaked: number;
  predictionCount: number;
  impliedOdds: number;
}

// ─── Mock competition: active, ends 2d 14h from now ──────────────────────────
const NOW = Date.now() / 1000;
export const MOCK_COMPETITION: Competition = {
  id: 1,
  pubkey: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  seasonId: 1,
  roundNumber: 3,
  startTime: NOW - 86400 * 4.5,
  endTime: NOW + 86400 * 2 + 3600 * 14,
  totalPrize: 5000_000000, // 5000 USDC
  totalSquads: 8,
  status: "Active",
};

// ─── Mock squads ──────────────────────────────────────────────────────────────
export const MOCK_SQUADS: Squad[] = [
  {
    id: 1,
    pubkey: "AqBxGKF2NMbV3kS4dR9TjL7cPeW1uXnYmZoH6pQfDtE",
    name: "Liquidation Hunters",
    leader: "9xKq...4mRz",
    members: ["9xKq...4mRz", "3pLw...7nBf", "5tHj...2cDk", "8yVm...1sAp"],
    memberCount: 4,
    inviteOnly: false,
    aggregateScore: 2840,
    rank: 1,
    prevRank: 2,
    prizeAmount: 1500_000000,
    roundHistory: [1200, 1850, 2100, 2840],
    strategy: { leverage: 0.82, directionBias: 0.75, holdDuration: 0.3, winRate: 0.68, diversification: 0.4, riskAppetite: 0.85 },
  },
  {
    id: 2,
    pubkey: "BrCyHKF2NMbV3kS4dR9TjL7cPeW1uXnYmZoH6pQfDtE",
    name: "Basis Basis Basis",
    leader: "7wPn...8kLm",
    members: ["7wPn...8kLm", "2mQr...5vXz", "6sGh...9wNb"],
    memberCount: 3,
    inviteOnly: true,
    aggregateScore: 2210,
    rank: 2,
    prevRank: 1,
    prizeAmount: 750_000000,
    roundHistory: [2400, 2100, 1900, 2210],
    strategy: { leverage: 0.35, directionBias: 0.5, holdDuration: 0.7, winRate: 0.72, diversification: 0.85, riskAppetite: 0.3 },
  },
  {
    id: 3,
    pubkey: "CsDzIKF2NMbV3kS4dR9TjL7cPeW1uXnYmZoH6pQfDtE",
    name: "Vol Arb Gang",
    leader: "4kFt...3gCe",
    members: ["4kFt...3gCe", "1nBw...6hDq", "0jXp...4fRs", "9aYv...7eWm", "5cZk...2iNl"],
    memberCount: 5,
    inviteOnly: false,
    aggregateScore: 1730,
    rank: 3,
    prevRank: 4,
    prizeAmount: 250_000000,
    roundHistory: [800, 1200, 1650, 1730],
    strategy: { leverage: 0.55, directionBias: 0.48, holdDuration: 0.15, winRate: 0.61, diversification: 0.9, riskAppetite: 0.6 },
  },
  {
    id: 4,
    pubkey: "DtEaJKF2NMbV3kS4dR9TjL7cPeW1uXnYmZoH6pQfDtE",
    name: "The Long Game",
    leader: "6rMs...0dBh",
    members: ["6rMs...0dBh", "8uNt...5cFj"],
    memberCount: 2,
    inviteOnly: false,
    aggregateScore: 1290,
    rank: 4,
    prevRank: 3,
    prizeAmount: 0,
    roundHistory: [1800, 1500, 1100, 1290],
    strategy: { leverage: 0.25, directionBias: 0.8, holdDuration: 0.92, winRate: 0.55, diversification: 0.3, riskAppetite: 0.2 },
  },
  {
    id: 5,
    pubkey: "EuFbKKF2NMbV3kS4dR9TjL7cPeW1uXnYmZoH6pQfDtE",
    name: "Neural Edge",
    leader: "agent-v2.sol",
    members: ["agent-v2.sol", "agent-v2b.sol", "7xPz...3eHk"],
    memberCount: 3,
    inviteOnly: true,
    aggregateScore: 840,
    rank: 5,
    prevRank: 6,
    prizeAmount: 0,
    roundHistory: [300, 650, 920, 840],
    isAgent: true,
    strategy: { leverage: 0.45, directionBias: 0.52, holdDuration: 0.08, winRate: 0.78, diversification: 0.95, riskAppetite: 0.4 },
  },
  {
    id: 6,
    pubkey: "FvGcLKF2NMbV3kS4dR9TjL7cPeW1uXnYmZoH6pQfDtE",
    name: "Perp Punishers",
    leader: "1wQd...7aFm",
    members: ["1wQd...7aFm", "4yRe...2bGn", "9zSf...6cHo"],
    memberCount: 3,
    inviteOnly: false,
    aggregateScore: 510,
    rank: 6,
    prevRank: 5,
    prizeAmount: 0,
    roundHistory: [950, 700, 400, 510],
    strategy: { leverage: 0.7, directionBias: 0.65, holdDuration: 0.4, winRate: 0.52, diversification: 0.5, riskAppetite: 0.75 },
  },
  {
    id: 7,
    pubkey: "GwHdMKF2NMbV3kS4dR9TjL7cPeW1uXnYmZoH6pQfDtE",
    name: "GPT-4 Momentum",
    leader: "gpt4-agent.sol",
    members: ["gpt4-agent.sol", "gpt4-hedge.sol"],
    memberCount: 2,
    inviteOnly: false,
    aggregateScore: -230,
    rank: 7,
    prevRank: 7,
    prizeAmount: 0,
    roundHistory: [600, 200, -100, -230],
    isAgent: true,
    strategy: { leverage: 0.6, directionBias: 0.7, holdDuration: 0.05, winRate: 0.45, diversification: 0.7, riskAppetite: 0.55 },
  },
  {
    id: 8,
    pubkey: "HxIeNKF2NMbV3kS4dR9TjL7cPeW1uXnYmZoH6pQfDtE",
    name: "Alpha Extractors",
    leader: "5yVi...1fKr",
    members: ["5yVi...1fKr", "0zWj...6gLs", "7aTk...3hMs"],
    memberCount: 3,
    inviteOnly: false,
    aggregateScore: -670,
    rank: 8,
    prevRank: 8,
    prizeAmount: 0,
    roundHistory: [1100, 400, -200, -670],
    strategy: { leverage: 0.9, directionBias: 0.85, holdDuration: 0.2, winRate: 0.38, diversification: 0.2, riskAppetite: 0.95 },
  },
];

// ─── Mock predictions ─────────────────────────────────────────────────────────
export const MOCK_PREDICTIONS: PredictionEntry[] = MOCK_SQUADS.slice(0, 6).map((s) => ({
  squadPubkey: s.pubkey,
  squadName: s.name,
  totalStaked: Math.floor(Math.random() * 3000 + 200) * 1_000_000,
  predictionCount: Math.floor(Math.random() * 40 + 5),
  impliedOdds: 0, // computed below
}));

const totalPredStaked = MOCK_PREDICTIONS.reduce((s, p) => s + p.totalStaked, 0);
MOCK_PREDICTIONS.forEach((p) => {
  p.impliedOdds = p.totalStaked / totalPredStaked;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function formatScore(bps: number): string {
  const pct = bps / 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function scoreClass(bps: number): string {
  if (bps > 0) return "score-pos";
  if (bps < 0) return "score-neg";
  return "score-zero";
}

export function shortWallet(w: string): string {
  if (w.length <= 8) return w;
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}

export function formatUSDC(units: number): string {
  return `$${(units / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
