"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.getSquads = getSquads;
exports.getSquadById = getSquadById;
exports.getActiveCompetition = getActiveCompetition;
exports.getLeaderboard = getLeaderboard;
exports.getPredictionPool = getPredictionPool;
exports.getUserProfile = getUserProfile;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/adrena_squads',
});
exports.pool = pool;
async function getSquads(limit = 50, offset = 0) {
    const { rows } = await pool.query(`SELECT s.squad_id, s.squad_pubkey, s.leader_pubkey, s.name, s.invite_only, s.bond_deposited,
            COUNT(sm.wallet)::int AS member_count
     FROM squads s
     LEFT JOIN squad_members sm ON s.squad_pubkey = sm.squad_pubkey
     GROUP BY s.squad_id, s.squad_pubkey
     ORDER BY s.squad_id DESC
     LIMIT $1 OFFSET $2`, [limit, offset]);
    return rows;
}
async function getSquadById(squadPubkey) {
    const { rows } = await pool.query(`SELECT s.*, COUNT(sm.wallet)::int AS member_count
     FROM squads s
     LEFT JOIN squad_members sm ON s.squad_pubkey = sm.squad_pubkey
     WHERE s.squad_pubkey = $1
     GROUP BY s.squad_id, s.squad_pubkey`, [squadPubkey]);
    return rows[0] ?? null;
}
async function getActiveCompetition() {
    const { rows } = await pool.query(`SELECT * FROM competitions
     WHERE status IN ('Registration', 'Active', 'Calculating')
     ORDER BY competition_id DESC
     LIMIT 1`);
    return rows[0] ?? null;
}
async function getLeaderboard(competitionPubkey) {
    const { rows } = await pool.query(`SELECT
       se.rank,
       se.aggregate_score,
       se.prize_amount,
       s.squad_pubkey,
       s.name AS squad_name,
       s.leader_pubkey,
       COUNT(sm.wallet)::int AS member_count,
       json_agg(json_build_object(
         'wallet', ms.wallet,
         'score', ms.score,
         'realized_pnl', ms.realized_pnl_usd,
         'trade_count', ms.trade_count
       )) AS member_scores
     FROM squad_entries se
     JOIN squads s ON se.squad_pubkey = s.squad_pubkey
     LEFT JOIN squad_members sm ON s.squad_pubkey = sm.squad_pubkey
     LEFT JOIN member_scores ms ON se.entry_pubkey = ms.entry_pubkey
     WHERE se.competition_pubkey = $1
     GROUP BY se.rank, se.aggregate_score, se.prize_amount, s.squad_pubkey, s.name, s.leader_pubkey
     ORDER BY se.rank ASC NULLS LAST, se.aggregate_score DESC`, [competitionPubkey]);
    return rows;
}
async function getPredictionPool(competitionPubkey, roundNumber) {
    const { rows } = await pool.query(`SELECT
       competition_pubkey,
       round_number,
       squad_picked,
       SUM(amount_staked)::bigint AS total_on_squad,
       COUNT(*)::int AS prediction_count
     FROM predictions
     WHERE competition_pubkey = $1 AND round_number = $2
     GROUP BY competition_pubkey, round_number, squad_picked`, [competitionPubkey, roundNumber]);
    const totalStaked = rows.reduce((sum, r) => sum + Number(r.total_on_squad), 0);
    const squadsWithOdds = rows.map((r) => ({
        squadPubkey: r.squad_picked,
        totalStaked: Number(r.total_on_squad),
        predictionCount: r.prediction_count,
        impliedOdds: totalStaked > 0 ? Number(r.total_on_squad) / totalStaked : 0,
    }));
    return { totalStaked, squads: squadsWithOdds };
}
async function getUserProfile(wallet) {
    const squadRow = await pool.query(`SELECT s.squad_pubkey, s.name AS squad_name, s.squad_id
     FROM squads s
     JOIN squad_members sm ON s.squad_pubkey = sm.squad_pubkey
     WHERE sm.wallet = $1
     LIMIT 1`, [wallet]);
    const statsRow = await pool.query(`SELECT
       COUNT(DISTINCT se.competition_pubkey)::int AS competitions_entered,
       SUM(CASE WHEN se.rank = 1 THEN 1 ELSE 0 END)::int AS squad_wins,
       COALESCE(SUM(ms.score), 0)::bigint AS total_pnl_bps
     FROM squad_members sm
     LEFT JOIN squads s ON sm.squad_pubkey = s.squad_pubkey
     LEFT JOIN squad_entries se ON s.squad_pubkey = se.squad_pubkey
     LEFT JOIN member_scores ms ON se.entry_pubkey = ms.entry_pubkey AND ms.wallet = sm.wallet
     WHERE sm.wallet = $1`, [wallet]);
    const badgesRow = await pool.query('SELECT badge_type, awarded_at FROM badges WHERE wallet = $1 ORDER BY awarded_at DESC', [wallet]);
    return {
        wallet,
        currentSquad: squadRow.rows[0] ?? null,
        stats: statsRow.rows[0],
        badges: badgesRow.rows,
    };
}
//# sourceMappingURL=queries.js.map