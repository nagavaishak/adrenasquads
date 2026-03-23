use anchor_lang::prelude::*;
use crate::state::{Config, Competition, CompetitionStatus, PredictionPool, PredictionStatus};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct LockPredictions<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    #[account(
        constraint = competition.status == CompetitionStatus::Active @ ErrorCode::CompetitionNotActive
    )]
    pub competition: Account<'info, Competition>,

    #[account(
        mut,
        seeds = [b"prediction", competition.key().as_ref(), competition.round_number.to_le_bytes().as_ref()],
        bump = prediction_pool.bump,
        constraint = prediction_pool.status == PredictionStatus::Open @ ErrorCode::PredictionPoolLocked
    )]
    pub prediction_pool: Account<'info, PredictionPool>,
}

pub fn handler(ctx: Context<LockPredictions>) -> Result<()> {
    ctx.accounts.prediction_pool.status = PredictionStatus::Locked;
    Ok(())
}
