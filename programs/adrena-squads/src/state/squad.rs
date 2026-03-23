use anchor_lang::prelude::*;

/// A trading squad of 2-5 members.
/// Seeds: [b"squad", squad_id.to_le_bytes()]
#[account]
pub struct Squad {
    /// Unique sequential ID
    pub squad_id: u64,
    /// Squad leader — created the squad and paid the bond
    pub leader: Pubkey,
    /// Members including the leader (max 5)
    pub members: Vec<Pubkey>,
    /// Display name, max 32 characters
    pub name: String,
    /// Whether joining requires an invite (enforced off-chain via invite link)
    pub invite_only: bool,
    /// Whether the 50 USDC bond has been deposited
    pub bond_deposited: bool,
    /// Unix timestamp of squad creation
    pub created_at: i64,
    pub bump: u8,
}

impl Squad {
    /// Maximum members per squad
    pub const MAX_MEMBERS: usize = 5;
    /// Maximum name length in bytes
    pub const MAX_NAME_LEN: usize = 32;
    /// Account size: discriminator + fields
    pub const SIZE: usize =
        8    // discriminator
        + 8  // squad_id
        + 32 // leader
        + (4 + 32 * Self::MAX_MEMBERS) // members vec
        + (4 + Self::MAX_NAME_LEN)     // name string
        + 1  // invite_only
        + 1  // bond_deposited
        + 8  // created_at
        + 1; // bump
}
