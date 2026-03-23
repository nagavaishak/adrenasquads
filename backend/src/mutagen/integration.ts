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

import { pool } from '../db/queries.js';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Pure business logic (fully testable without DB) ──────────────────────────

/**
 * Compute the Mutagen multiplier from already-resolved squad state.
 * Keeping this pure makes it easy to unit test without mocking the DB.
 */
export function calculateMutagenBoost(
  wallet: string,
  opts: {
    inSquad: boolean;
    squadRank: number | null;
    squadName: string | null;
    squadPubkey: string | null;
    competitionId: number | null;
    isActive: boolean;
  },
): MutagenBoostResult {
  const { inSquad, squadRank, squadName, squadPubkey, competitionId, isActive } = opts;

  if (!inSquad || !isActive) {
    return {
      wallet,
      mutagen_multiplier: 1.0,
      squad_name: squadName,
      squad_pubkey: squadPubkey,
      squad_rank: squadRank,
      competition_id: competitionId,
      is_active: false,
      reason: inSquad
        ? 'Squad not registered in any active competition'
        : 'Wallet not in any squad',
    };
  }

  // Squad is active but round not yet finalized — rank not assigned yet
  if (squadRank === null) {
    return {
      wallet,
      mutagen_multiplier: 1.2,
      squad_name: squadName,
      squad_pubkey: squadPubkey,
      squad_rank: null,
      competition_id: competitionId,
      is_active: false, // scoring round not yet finalized
      reason: 'Squad registered in active competition (round not yet finalized)',
    };
  }

  if (squadRank === 1) {
    return {
      wallet,
      mutagen_multiplier: 1.8,
      squad_name: squadName,
      squad_pubkey: squadPubkey,
      squad_rank: squadRank,
      competition_id: competitionId,
      is_active: true,
      reason: `Squad ranked #1 in active competition — top multiplier`,
    };
  }

  if (squadRank <= 3) {
    return {
      wallet,
      mutagen_multiplier: 1.5,
      squad_name: squadName,
      squad_pubkey: squadPubkey,
      squad_rank: squadRank,
      competition_id: competitionId,
      is_active: true,
      reason: `Squad ranked #${squadRank} in active competition`,
    };
  }

  return {
    wallet,
    mutagen_multiplier: 1.2,
    squad_name: squadName,
    squad_pubkey: squadPubkey,
    squad_rank: squadRank,
    competition_id: competitionId,
    is_active: true,
    reason: `Squad active in competition (ranked #${squadRank})`,
  };
}

// ── DB-backed resolver ────────────────────────────────────────────────────────

/**
 * Resolve Mutagen boost for a single wallet.
 * Queries the DB to find the wallet's current squad and its rank
 * in any active/calculating competition.
 */
export async function getMutagenBoost(wallet: string): Promise<MutagenBoostResult> {
  if (!wallet || wallet.length < 32) {
    return calculateMutagenBoost(wallet, {
      inSquad: false,
      squadRank: null,
      squadName: null,
      squadPubkey: null,
      competitionId: null,
      isActive: false,
    });
  }

  // Single query: find the wallet's squad and its rank in an active competition
  const { rows } = await pool.query<{
    squad_pubkey: string;
    squad_name: string;
    competition_id: number;
    rank: number | null;
    status: string;
  }>(
    `SELECT
       s.squad_pubkey,
       s.name            AS squad_name,
       c.competition_id,
       se.rank,
       c.status
     FROM squad_members sm
     JOIN squads s         ON s.squad_pubkey = sm.squad_pubkey
     JOIN squad_entries se ON se.squad_pubkey = s.squad_pubkey
     JOIN competitions c   ON c.competition_pubkey = se.competition_pubkey
     WHERE sm.wallet = $1
       AND c.status IN ('Active', 'Calculating')
     ORDER BY c.competition_id DESC
     LIMIT 1`,
    [wallet],
  );

  if (rows.length === 0) {
    // Check whether the wallet is at least in a squad (even if not in a competition)
    const squadCheck = await pool.query(
      `SELECT s.squad_pubkey, s.name AS squad_name
       FROM squad_members sm
       JOIN squads s ON s.squad_pubkey = sm.squad_pubkey
       WHERE sm.wallet = $1 LIMIT 1`,
      [wallet],
    );

    return calculateMutagenBoost(wallet, {
      inSquad: squadCheck.rows.length > 0,
      squadRank: null,
      squadName: squadCheck.rows[0]?.squad_name ?? null,
      squadPubkey: squadCheck.rows[0]?.squad_pubkey ?? null,
      competitionId: null,
      isActive: false,
    });
  }

  const row = rows[0];
  return calculateMutagenBoost(wallet, {
    inSquad: true,
    squadRank: row.rank ?? null,
    squadName: row.squad_name,
    squadPubkey: row.squad_pubkey,
    competitionId: row.competition_id,
    isActive: true,
  });
}

/**
 * Return Mutagen multipliers for ALL members of ALL squads in a competition.
 * Designed for Adrena's backend to batch-apply multipliers without N+1 queries.
 */
export async function getSquadBoostsForCompetition(
  competitionId: number,
): Promise<SquadBoostEntry[]> {
  const { rows } = await pool.query<{
    squad_pubkey: string;
    squad_name: string;
    rank: number | null;
    wallet: string;
  }>(
    `SELECT
       s.squad_pubkey,
       s.name   AS squad_name,
       se.rank,
       sm.wallet
     FROM competitions c
     JOIN squad_entries se ON se.competition_pubkey = c.competition_pubkey
     JOIN squads s         ON s.squad_pubkey = se.squad_pubkey
     JOIN squad_members sm ON sm.squad_pubkey = s.squad_pubkey
     WHERE c.competition_id = $1
     ORDER BY se.rank ASC NULLS LAST, s.squad_pubkey`,
    [competitionId],
  );

  // Group by squad
  const squadMap = new Map<string, SquadBoostEntry>();
  for (const row of rows) {
    if (!squadMap.has(row.squad_pubkey)) {
      const boost = calculateMutagenBoost(row.wallet, {
        inSquad: true,
        squadRank: row.rank ?? null,
        squadName: row.squad_name,
        squadPubkey: row.squad_pubkey,
        competitionId,
        isActive: true,
      });
      squadMap.set(row.squad_pubkey, {
        squad_pubkey: row.squad_pubkey,
        squad_name: row.squad_name,
        squad_rank: row.rank ?? null,
        member_multiplier: boost.mutagen_multiplier,
        members: [],
      });
    }
    const entry = squadMap.get(row.squad_pubkey)!;
    entry.members.push({
      wallet: row.wallet,
      mutagen_multiplier: entry.member_multiplier,
    });
  }

  return Array.from(squadMap.values());
}
