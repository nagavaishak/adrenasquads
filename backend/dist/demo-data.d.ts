/**
 * Realistic demo data returned when the database is unavailable.
 * Lets the API work end-to-end during evaluation without a live Postgres instance.
 */
export declare const DEMO_COMPETITION: {
    competition_id: number;
    competition_pubkey: string;
    season_id: number;
    round_number: number;
    start_time: string;
    end_time: string;
    total_prize_amount: string;
    total_squads: number;
    status: string;
    merkle_root: null;
};
export declare const DEMO_SQUADS: {
    squad_id: number;
    squad_pubkey: string;
    leader_pubkey: string;
    name: string;
    invite_only: boolean;
    bond_deposited: boolean;
    member_count: number;
    aggregate_score: number;
    rank: number;
}[];
export declare const DEMO_LEADERBOARD: {
    rank: number;
    squad_pubkey: string;
    squad_name: string;
    leader_pubkey: string;
    aggregate_score: number;
    prize_amount: number;
    member_count: number;
    member_scores: {
        wallet: string;
        score: number;
        realized_pnl: string;
        trade_count: number;
    }[];
}[];
export declare const DEMO_PREDICTION_POOL: {
    totalStaked: number;
    squads: {
        squadPubkey: string;
        totalStaked: number;
        predictionCount: number;
        impliedOdds: number;
    }[];
};
//# sourceMappingURL=demo-data.d.ts.map