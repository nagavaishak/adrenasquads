use anchor_lang::prelude::*;
use crate::state::{Config, Competition, CompetitionStatus};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct EndCompetition<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        constraint = competition.authority == authority.key() @ ErrorCode::Unauthorized,
        constraint = competition.status == CompetitionStatus::Calculating @ ErrorCode::CompetitionNotCalculating
    )]
    pub competition: Account<'info, Competition>,
}

/// Set the merkle root and transition to Finalized, enabling prize claims.
pub fn handler(ctx: Context<EndCompetition>, merkle_root: [u8; 32]) -> Result<()> {
    let competition = &mut ctx.accounts.competition;
    competition.merkle_root = merkle_root;
    competition.status = CompetitionStatus::Finalized;
    Ok(())
}
