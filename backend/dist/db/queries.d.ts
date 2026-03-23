import { Pool } from 'pg';
declare const pool: Pool;
export { pool };
export interface DbSquad {
    squad_id: number;
    squad_pubkey: string;
    leader_pubkey: string;
    name: string;
    invite_only: boolean;
    bond_deposited: boolean;
    member_count?: number;
    aggregate_score?: number;
    rank?: number;
}
export interface DbCompetition {
    competition_id: number;
    competition_pubkey: string;
    season_id: number;
    round_number: number;
    start_time: Date;
    end_time: Date;
    total_prize_amount: string;
    total_squads: number;
    status: string;
    merkle_root: string | null;
}
export declare function getSquads(limit?: number, offset?: number): Promise<DbSquad[]>;
export declare function getSquadById(squadPubkey: string): Promise<DbSquad | null>;
export declare function getActiveCompetition(): Promise<DbCompetition | null>;
export declare function getLeaderboard(competitionPubkey: string): Promise<any[]>;
export declare function getPredictionPool(competitionPubkey: string, roundNumber: number): Promise<any>;
export declare function getUserProfile(wallet: string): Promise<any>;
//# sourceMappingURL=queries.d.ts.map