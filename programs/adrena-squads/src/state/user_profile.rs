use anchor_lang::prelude::*;

/// Cross-competition user state. One per wallet.
/// Seeds: [b"user_profile", user.key()]
#[account]
pub struct UserProfile {
    pub user: Pubkey,
    /// The squad this user currently belongs to (None if solo)
    pub current_squad: Option<Pubkey>,
    pub competitions_entered: u32,
    pub squad_wins: u32,
    /// Cumulative squad PnL across all competitions in basis points
    pub total_squad_pnl_bps: i64,
    /// Bitmask of earned badge types
    pub badges: u64,
    pub bump: u8,
}

impl UserProfile {
    pub const SIZE: usize =
        8    // discriminator
        + 32 // user
        + (1 + 32) // Option<Pubkey>
        + 4  // competitions_entered
        + 4  // squad_wins
        + 8  // total_squad_pnl_bps
        + 8  // badges bitmask
        + 1; // bump
}

/// Badge type bit positions
pub mod badges {
    pub const SQUAD_CHAMPION: u64 = 1 << 0;
    pub const HOT_STREAK: u64 = 1 << 1;
    pub const DIAMOND_HANDS: u64 = 1 << 2;
    pub const PERFECT_ROUND: u64 = 1 << 3;
    pub const SQUAD_BUILDER: u64 = 1 << 4;
    pub const ORACLE: u64 = 1 << 5;
}
