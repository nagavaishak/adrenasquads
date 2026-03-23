use anchor_lang::prelude::*;

/// Program-level configuration PDA. Created once by deployer.
/// Seeds: [b"config"]
#[account]
pub struct Config {
    /// Authority that can create/finalize competitions
    pub authority: Pubkey,
    /// Auto-incrementing ID for the next squad
    pub next_squad_id: u64,
    /// Auto-incrementing ID for the next competition
    pub next_competition_id: u64,
    /// Bond amount required to create a squad (50 USDC = 50_000_000)
    pub bond_amount: u64,
    /// Fee taken from winning predictions in basis points (500 = 5%)
    pub prediction_fee_bps: u16,
    /// Vault that holds all squad bonds
    pub bond_vault: Pubkey,
    pub bump: u8,
}

impl Config {
    pub const SIZE: usize =
        8    // discriminator
        + 32 // authority
        + 8  // next_squad_id
        + 8  // next_competition_id
        + 8  // bond_amount
        + 2  // prediction_fee_bps
        + 32 // bond_vault
        + 1; // bump
}
