/**
 * Mutagen Integration — Adrena Squads
 *
 * Provides squad-based Mutagen multipliers for Adrena's existing points system.
 * Adrena's backend can call these functions (or the REST endpoints in index.ts)
 * to apply squad performance bonuses to individual Mutagen scores.
 *
 * Multiplier tiers:
 *   1.8x — wallet's squad finished #1 in the active competition
 *   1.5x — squad in top 3 (ranks 2-3)
 *   1.2x — in any squad registered to an active competition
 *   1.0x — not in a squad, or no active competition
 */
export interface MutagenBoostResult {
    wallet: string;
    mutagen_multiplier: 1.0 | 1.2 | 1.5 | 1.8;
    squad_name: string | null;
    squad_pubkey: string | null;
    squad_rank: number | null;
    competition_id: number | null;
    is_active: boolean;
    reason: string;
}
export interface SquadBoostEntry {
    squad_pubkey: string;
    squad_name: string;
    squad_rank: number | null;
    member_multiplier: 1.0 | 1.2 | 1.5 | 1.8;
    members: Array<{
        wallet: string;
        mutagen_multiplier: 1.0 | 1.2 | 1.5 | 1.8;
    }>;
}
/**
 * Compute the Mutagen multiplier from already-resolved squad state.
 * Keeping this pure makes it easy to unit test without mocking the DB.
 */
export declare function calculateMutagenBoost(wallet: string, opts: {
    inSquad: boolean;
    squadRank: number | null;
    squadName: string | null;
    squadPubkey: string | null;
    competitionId: number | null;
    isActive: boolean;
}): MutagenBoostResult;
/**
 * Resolve Mutagen boost for a single wallet.
 * Queries the DB to find the wallet's current squad and its rank
 * in any active/calculating competition.
 */
export declare function getMutagenBoost(wallet: string): Promise<MutagenBoostResult>;
/**
 * Return Mutagen multipliers for ALL members of ALL squads in a competition.
 * Designed for Adrena's backend to batch-apply multipliers without N+1 queries.
 */
export declare function getSquadBoostsForCompetition(competitionId: number): Promise<SquadBoostEntry[]>;
//# sourceMappingURL=integration.d.ts.map