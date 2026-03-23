use anchor_lang::prelude::*;

/// Per-squad record for a single competition round.
/// Seeds: [b"squad_entry", competition.key(), squad.key()]
#[account]
pub struct SquadEntry {
    pub competition: Pubkey,
    pub squad: Pubkey,
    /// Aggregate squad score in basis points (e.g., 1500 = 15.00% return)
    pub aggregate_score: i64,
    /// Individual member scores in same order as squad.members
    pub member_scores: Vec<i64>,
    /// Number of trades executed by each member during the round
    pub member_trade_counts: Vec<u32>,
    /// Final rank within the competition (1-based)
    pub rank: u32,
    /// Prize amount allocated (in USDC token units)
    pub prize_amount: u64,
    pub finalized: bool,
    pub bump: u8,
}

impl SquadEntry {
    pub const MAX_MEMBERS: usize = 5;
    pub const SIZE: usize =
        8    // discriminator
        + 32 // competition
        + 32 // squad
        + 8  // aggregate_score
        + (4 + 8 * Self::MAX_MEMBERS) // member_scores vec
        + (4 + 4 * Self::MAX_MEMBERS) // member_trade_counts vec
        + 4  // rank
        + 8  // prize_amount
        + 1  // finalized
        + 1; // bump
}
