use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PredictionStatus {
    /// Accepting bets
    Open,
    /// Locked — competition started, no new bets
    Locked,
    /// Winning squad set, payouts claimable
    Resolved,
}

impl Default for PredictionStatus {
    fn default() -> Self {
        PredictionStatus::Open
    }
}

/// Per-round prediction pool. One per competition round.
/// Seeds: [b"prediction", competition.key(), round_number.to_le_bytes()]
#[account]
pub struct PredictionPool {
    pub competition: Pubkey,
    pub round_number: u32,
    /// Total USDC staked across all predictions
    pub total_staked: u64,
    /// (squad_pubkey, total_staked_on_that_squad) pairs
    pub squad_stakes: Vec<(Pubkey, u64)>,
    pub status: PredictionStatus,
    /// Set after round is finalized
    pub winning_squad: Option<Pubkey>,
    /// Token account holding prediction stakes
    pub stake_vault: Pubkey,
    pub bump: u8,
}

impl PredictionPool {
    pub const MAX_SQUADS: usize = 50;
    pub const SIZE: usize =
        8    // discriminator
        + 32 // competition
        + 4  // round_number
        + 8  // total_staked
        + (4 + (32 + 8) * Self::MAX_SQUADS) // squad_stakes vec
        + 1  // status enum
        + (1 + 32) // Option<Pubkey> winning_squad
        + 32 // stake_vault
        + 1; // bump
}

/// A single user's prediction on a squad winning a round.
/// Seeds: [b"pred_entry", pool.key(), user.key()]
#[account]
pub struct PredictionEntry {
    pub pool: Pubkey,
    pub user: Pubkey,
    /// The squad the user predicted would win
    pub squad_picked: Pubkey,
    /// Amount staked in USDC token units
    pub amount_staked: u64,
    /// Whether the user has already claimed their winnings
    pub claimed: bool,
    pub bump: u8,
}

impl PredictionEntry {
    pub const SIZE: usize =
        8    // discriminator
        + 32 // pool
        + 32 // user
        + 32 // squad_picked
        + 8  // amount_staked
        + 1  // claimed
        + 1; // bump
}
