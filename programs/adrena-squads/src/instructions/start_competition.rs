use anchor_lang::prelude::*;
use crate::state::{Config, Competition, CompetitionStatus};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct StartCompetition<'info> {
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
        constraint = competition.status == CompetitionStatus::Registration @ ErrorCode::CompetitionNotRegistration
    )]
    pub competition: Account<'info, Competition>,
}

pub fn handler(ctx: Context<StartCompetition>) -> Result<()> {
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= ctx.accounts.competition.start_time,
        ErrorCode::CompetitionNotStarted
    );

    ctx.accounts.competition.status = CompetitionStatus::Active;
    Ok(())
}
