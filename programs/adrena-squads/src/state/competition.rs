use anchor_lang::prelude::*;

/// Status of a competition round
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum CompetitionStatus {
    /// Squads can register, not yet started
    Registration,
    /// Round is live — trading is underway
    Active,
    /// Round ended, scores being calculated off-chain
    Calculating,
    /// Scores submitted, prizes claimable
    Finalized,
}

impl Default for CompetitionStatus {
    fn default() -> Self {
        CompetitionStatus::Registration
    }
}

/// A single weekly round within a season.
/// Seeds: [b"competition", competition_id.to_le_bytes()]
#[account]
pub struct Competition {
    pub competition_id: u64,
    /// Program authority (crank wallet)
    pub authority: Pubkey,
    pub season_id: u64,
    pub round_number: u32,
    /// Unix timestamp when competition goes Active
    pub start_time: i64,
    /// Unix timestamp when competition ends (scores submitted)
    pub end_time: i64,
    /// SPL mint used for prizes (USDC)
    pub prize_mint: Pubkey,
    /// Token account holding prize funds
    pub prize_vault: Pubkey,
    /// Total USDC allocated as prizes (in token units)
    pub total_prize_amount: u64,
    pub total_squads: u32,
    pub status: CompetitionStatus,
    /// Merkle root submitted during finalize — used for prize claims
    pub merkle_root: [u8; 32],
    pub bump: u8,
}

impl Competition {
    pub const SIZE: usize =
        8    // discriminator
        + 8  // competition_id
        + 32 // authority
        + 8  // season_id
        + 4  // round_number
        + 8  // start_time
        + 8  // end_time
        + 32 // prize_mint
        + 32 // prize_vault
        + 8  // total_prize_amount
        + 4  // total_squads
        + 1  // status enum
        + 32 // merkle_root
        + 1; // bump
}
