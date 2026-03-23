use anchor_lang::prelude::*;

/// Proof that a claimant has already received their prize for a competition.
/// Initialized on first claim; its mere existence rejects any repeat claim.
/// Seeds: [b"claim", competition.key(), claimant.key()]
#[account]
pub struct ClaimRecord {
    pub competition: Pubkey,
    pub claimant: Pubkey,
    pub amount: u64,
    pub bump: u8,
}

impl ClaimRecord {
    pub const SIZE: usize =
        8   // discriminator
        + 32 // competition
        + 32 // claimant
        + 8  // amount
        + 1; // bump
}
