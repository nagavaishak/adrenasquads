const NOW = Math.floor(Date.now() / 1000);
export const ROUND_END = NOW + 2 * 24 * 3600 + 14 * 3600 + 59 * 60 + 13;

export const DEMO_COMPETITION = {
  competition_id: 1,
  competition_pubkey: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  season_id: 1,
  round_number: 3,
  start_time: new Date((NOW - 5 * 24 * 3600) * 1000).toISOString(),
  end_time: new Date(ROUND_END * 1000).toISOString(),
  total_prize_amount: "5000000000",
  total_squads: 8,
  status: "Active",
  merkle_root: null,
};

export const DEMO_SQUADS = [
  { squad_id: 1, squad_pubkey: "LH1sqd1xxxx", leader_pubkey: "WalA1xxx", name: "Liquidation Hunters",   invite_only: false, bond_deposited: true, member_count: 4, aggregate_score: 2840, rank: 1 },
  { squad_id: 2, squad_pubkey: "BB2sqd2xxxx", leader_pubkey: "WalB1xxx", name: "Basis Basis Basis",     invite_only: true,  bond_deposited: true, member_count: 3, aggregate_score: 2210, rank: 2 },
  { squad_id: 3, squad_pubkey: "VA3sqd3xxxx", leader_pubkey: "WalC1xxx", name: "Vol Arb Gang",          invite_only: false, bond_deposited: true, member_count: 5, aggregate_score: 1730, rank: 3 },
  { squad_id: 4, squad_pubkey: "LG4sqd4xxxx", leader_pubkey: "WalD1xxx", name: "The Long Game",         invite_only: false, bond_deposited: true, member_count: 2, aggregate_score: 1290, rank: 4 },
  { squad_id: 5, squad_pubkey: "DN5sqd5xxxx", leader_pubkey: "WalE1xxx", name: "Delta Neutral",          invite_only: false, bond_deposited: true, member_count: 4, aggregate_score:  840, rank: 5 },
  { squad_id: 6, squad_pubkey: "PP6sqd6xxxx", leader_pubkey: "WalF1xxx", name: "Perp Punishers",         invite_only: false, bond_deposited: true, member_count: 3, aggregate_score:  510, rank: 6 },
  { squad_id: 7, squad_pubkey: "SS7sqd7xxxx", leader_pubkey: "WalG1xxx", name: "Solana Sharpshooters",   invite_only: false, bond_deposited: true, member_count: 2, aggregate_score: -230, rank: 7 },
  { squad_id: 8, squad_pubkey: "AE8sqd8xxxx", leader_pubkey: "WalH1xxx", name: "Alpha Extractors",      invite_only: false, bond_deposited: true, member_count: 3, aggregate_score: -670, rank: 8 },
];

export const DEMO_LEADERBOARD = DEMO_SQUADS.map((s, i) => ({
  rank: i + 1,
  squad_pubkey: s.squad_pubkey,
  squad_name: s.name,
  leader_pubkey: s.leader_pubkey,
  aggregate_score: s.aggregate_score,
  prize_amount: [1500, 750, 250, 0, 0, 0, 0, 0][i] ?? 0,
  member_count: s.member_count,
  member_scores: Array.from({ length: s.member_count }, (_, j) => ({
    wallet: `Wal${String.fromCharCode(65 + i)}${j + 1}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
    score: Math.round(s.aggregate_score * (0.7 + j * 0.15)),
    realized_pnl: (s.aggregate_score / 100 * (0.9 + j * 0.1)).toFixed(2),
    trade_count: 5 + j * 4,
  })),
}));

export const DEMO_PREDICTION_POOL = {
  totalStaked: 12400,
  squads: DEMO_SQUADS.slice(0, 5).map((s, i) => ({
    squadPubkey: s.squad_pubkey,
    totalStaked: [4800, 3200, 2100, 1400, 900][i],
    predictionCount: [23, 15, 11, 8, 5][i],
    impliedOdds: [1.3, 1.9, 2.9, 4.4, 6.9][i],
  })),
};
