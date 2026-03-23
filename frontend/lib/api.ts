// In production (Vercel) the API routes live on the same origin at /api.
// In local dev, fall back to localhost:3001 if a separate backend is running.
const BASE =
  typeof window !== "undefined"
    ? ""  // same-origin in browser
    : process.env.NEXT_PUBLIC_API_URL ?? "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 10 } });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  const json = await res.json();
  return json.data as T;
}

export interface ApiSquad {
  squad_id: number;
  squad_pubkey: string;
  leader_pubkey: string;
  name: string;
  invite_only: boolean;
  bond_deposited: boolean;
  member_count: number;
  aggregate_score?: number;
  rank?: number;
}

export interface ApiCompetition {
  competition_id: number;
  competition_pubkey: string;
  season_id: number;
  round_number: number;
  start_time: string;
  end_time: string;
  total_prize_amount: string;
  total_squads: number;
  status: string;
  merkle_root: string | null;
}

export interface ApiLeaderboardEntry {
  rank: number;
  squad_pubkey: string;
  squad_name: string;
  leader_pubkey: string;
  aggregate_score: number;
  prize_amount: number;
  member_count: number;
  member_scores: Array<{
    wallet: string;
    score: number;
    realized_pnl: string;
    trade_count: number;
  }>;
}

export interface ApiPredictionPool {
  totalStaked: number;
  squads: Array<{
    squadPubkey: string;
    totalStaked: number;
    predictionCount: number;
    impliedOdds: number;
  }>;
}

export interface ApiCorrelationResult {
  walletA: string;
  walletB: string;
  correlationScore: number;
  sharedTrades: number;
  flagged: boolean;
}

export interface ApiWashTradingResult {
  wallet: string;
  rapidRoundTrips: number;
  volumePnlRatio: number;
  totalVolume: number;
  totalPnl: number;
  flagged: boolean;
}

export interface ApiInactiveMemberResult {
  wallet: string;
  tradeCount: number;
  lastTradeAt: number | null;
  hoursInactive: number | null;
  flagged: boolean;
}

export interface ApiFrontRunResult {
  wallet: string;
  placedAt: number;
  secondsBeforeLock: number;
  amount: number;
  flagged: boolean;
}

export interface ApiAbuseReport {
  competition_id: number;
  competition_status: string;
  generated_at: string;
  total_squads: number;
  total_traders: number;
  flagged_wallets: number;
  risk_score: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  correlated_trading: ApiCorrelationResult[];
  wash_trading: ApiWashTradingResult[];
  inactive_members: ApiInactiveMemberResult[];
  prediction_frontrunning: ApiFrontRunResult[];
}

async function getAdmin<T>(path: string, adminKey: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Admin-Key": adminKey },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  const json = await res.json();
  return json.data as T;
}

export const api = {
  squads: {
    list: () => get<ApiSquad[]>("/api/squads"),
    get: (id: string) => get<ApiSquad>(`/api/squads/${id}`),
  },
  competition: {
    active: () => get<ApiCompetition | null>("/api/competition"),
    leaderboard: () => get<ApiLeaderboardEntry[]>("/api/competition/leaderboard"),
  },
  predictions: {
    pool: (round: number) => get<ApiPredictionPool>(`/api/predictions/${round}`),
  },
  profile: {
    get: (wallet: string) => get<unknown>(`/api/profile/${wallet}`),
  },
  admin: {
    abuseReport: (competitionId: number, adminKey: string) =>
      getAdmin<ApiAbuseReport>(`/api/admin/abuse-report/${competitionId}`, adminKey),
  },
};
