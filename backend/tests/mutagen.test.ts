/**
 * Unit tests for the Mutagen integration module.
 *
 * Tests the pure `calculateMutagenBoost` function directly — no DB required.
 * Follows the same fixture pattern as scoring.test.ts.
 *
 * Run with: npm test  (from backend/)
 */

import { calculateMutagenBoost, MutagenBoostResult } from '../src/mutagen/integration';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const WALLET_A = 'WalletAAAA1111111111111111111111111111111';
const WALLET_B = 'WalletBBBB2222222222222222222222222222222';
const SQUAD_ALPHA = { name: 'Alpha Wolves', pubkey: 'SquadPDA111111111111111111111111111111111' };
const SQUAD_BETA  = { name: 'Beta Rippers',  pubkey: 'SquadPDA222222222222222222222222222222222' };
const COMP_ID     = 1;

function boost(wallet: string, opts: {
  inSquad?: boolean;
  squadRank?: number | null;
  squadName?: string | null;
  squadPubkey?: string | null;
  competitionId?: number | null;
  isActive?: boolean;
}): MutagenBoostResult {
  // Use !== undefined so that explicit null values are passed through as-is
  return calculateMutagenBoost(wallet, {
    inSquad:       opts.inSquad       !== undefined ? opts.inSquad       : true,
    squadRank:     opts.squadRank     !== undefined ? opts.squadRank     : null,
    squadName:     opts.squadName     !== undefined ? opts.squadName     : SQUAD_ALPHA.name,
    squadPubkey:   opts.squadPubkey   !== undefined ? opts.squadPubkey   : SQUAD_ALPHA.pubkey,
    competitionId: opts.competitionId !== undefined ? opts.competitionId : COMP_ID,
    isActive:      opts.isActive      !== undefined ? opts.isActive      : true,
  });
}

// ── Multiplier tiers ──────────────────────────────────────────────────────────

describe('calculateMutagenBoost — multiplier tiers', () => {

  it('wallet in rank-1 squad → 1.8x multiplier', () => {
    const result = boost(WALLET_A, { squadRank: 1 });
    expect(result.mutagen_multiplier).toBe(1.8);
    expect(result.squad_rank).toBe(1);
    expect(result.is_active).toBe(true);
    expect(result.wallet).toBe(WALLET_A);
  });

  it('wallet in rank-2 squad → 1.5x multiplier', () => {
    const result = boost(WALLET_A, { squadRank: 2 });
    expect(result.mutagen_multiplier).toBe(1.5);
    expect(result.squad_rank).toBe(2);
    expect(result.is_active).toBe(true);
  });

  it('wallet in rank-3 squad → 1.5x multiplier', () => {
    const result = boost(WALLET_A, { squadRank: 3 });
    expect(result.mutagen_multiplier).toBe(1.5);
    expect(result.squad_rank).toBe(3);
  });

  it('wallet in rank-4 squad → 1.2x (not top-3)', () => {
    const result = boost(WALLET_A, { squadRank: 4 });
    expect(result.mutagen_multiplier).toBe(1.2);
    expect(result.is_active).toBe(true);
  });

  it('wallet in squad not yet ranked (null rank) → 1.2x', () => {
    // Squad registered but round not yet finalized — rank is null
    const result = boost(WALLET_A, { squadRank: null, isActive: true });
    expect(result.mutagen_multiplier).toBe(1.2);
    expect(result.squad_rank).toBeNull();
    expect(result.is_active).toBe(false); // null rank = not yet active
  });

  it('wallet not in any squad → 1.0x', () => {
    const result = boost(WALLET_A, {
      inSquad: false,
      squadRank: null,
      squadName: null,
      squadPubkey: null,
      competitionId: null,
      isActive: false,
    });
    expect(result.mutagen_multiplier).toBe(1.0);
    expect(result.is_active).toBe(false);
    expect(result.squad_name).toBeNull();
  });

  it('wallet in squad but no active competition → 1.0x', () => {
    const result = boost(WALLET_A, {
      inSquad: true,
      squadRank: null,
      competitionId: null,
      isActive: false,
    });
    expect(result.mutagen_multiplier).toBe(1.0);
    expect(result.is_active).toBe(false);
  });

  it('invalid / empty wallet → 1.0x with is_active false', () => {
    const result = calculateMutagenBoost('', {
      inSquad: false,
      squadRank: null,
      squadName: null,
      squadPubkey: null,
      competitionId: null,
      isActive: false,
    });
    expect(result.mutagen_multiplier).toBe(1.0);
    expect(result.is_active).toBe(false);
  });

});

// ── Response shape ────────────────────────────────────────────────────────────

describe('calculateMutagenBoost — response shape', () => {

  it('returns all required fields for a top-1 squad', () => {
    const result = boost(WALLET_A, {
      squadRank: 1,
      squadName: SQUAD_ALPHA.name,
      squadPubkey: SQUAD_ALPHA.pubkey,
      competitionId: COMP_ID,
    });
    expect(result).toMatchObject({
      wallet: WALLET_A,
      mutagen_multiplier: 1.8,
      squad_name: SQUAD_ALPHA.name,
      squad_pubkey: SQUAD_ALPHA.pubkey,
      squad_rank: 1,
      competition_id: COMP_ID,
      is_active: true,
    });
    expect(typeof result.reason).toBe('string');
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it('reason string mentions rank for top-3 squads', () => {
    const result = boost(WALLET_A, { squadRank: 2 });
    expect(result.reason).toContain('#2');
  });

  it('reason string describes no-squad case', () => {
    const result = boost(WALLET_B, {
      inSquad: false,
      squadRank: null,
      squadName: null,
      squadPubkey: null,
      competitionId: null,
      isActive: false,
    });
    expect(result.reason.toLowerCase()).toContain('squad');
  });

});

// ── Boundary conditions ───────────────────────────────────────────────────────

describe('calculateMutagenBoost — boundaries', () => {

  it('rank 3 (boundary) → 1.5x, rank 4 (boundary) → 1.2x', () => {
    expect(boost(WALLET_A, { squadRank: 3 }).mutagen_multiplier).toBe(1.5);
    expect(boost(WALLET_A, { squadRank: 4 }).mutagen_multiplier).toBe(1.2);
  });

  it('very high rank (e.g. 100) → 1.2x (still in active competition)', () => {
    const result = boost(WALLET_A, { squadRank: 100 });
    expect(result.mutagen_multiplier).toBe(1.2);
    expect(result.is_active).toBe(true);
  });

  it('preserves wallet address exactly', () => {
    const wallet = 'ExactWallet1111111111111111111111111111111';
    const result = boost(wallet, { squadRank: 1 });
    expect(result.wallet).toBe(wallet);
  });

  it('different squads produce independent results', () => {
    const r1 = calculateMutagenBoost(WALLET_A, {
      inSquad: true, squadRank: 1,
      squadName: SQUAD_ALPHA.name, squadPubkey: SQUAD_ALPHA.pubkey,
      competitionId: COMP_ID, isActive: true,
    });
    const r2 = calculateMutagenBoost(WALLET_B, {
      inSquad: true, squadRank: 5,
      squadName: SQUAD_BETA.name, squadPubkey: SQUAD_BETA.pubkey,
      competitionId: COMP_ID, isActive: true,
    });
    expect(r1.mutagen_multiplier).toBe(1.8);
    expect(r2.mutagen_multiplier).toBe(1.2);
    expect(r1.squad_pubkey).not.toBe(r2.squad_pubkey);
  });

});
