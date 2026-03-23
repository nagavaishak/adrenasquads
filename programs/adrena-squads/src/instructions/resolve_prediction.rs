use anchor_lang::prelude::*;
use crate::state::{Config, Competition, CompetitionStatus, PredictionPool, PredictionStatus};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct ResolvePrediction<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    #[account(
        constraint = competition.status == CompetitionStatus::Finalized @ ErrorCode::CompetitionNotActive
    )]
    pub competition: Account<'info, Competition>,

    #[account(
        mut,
        seeds = [b"prediction", competition.key().as_ref(), competition.round_number.to_le_bytes().as_ref()],
        bump = prediction_pool.bump,
        constraint = prediction_pool.status == PredictionStatus::Locked @ ErrorCode::PredictionPoolLocked
    )]
    pub prediction_pool: Account<'info, PredictionPool>,
}

pub fn handler(ctx: Context<ResolvePrediction>, winning_squad: Pubkey) -> Result<()> {
    let pool = &mut ctx.accounts.prediction_pool;
    pool.winning_squad = Some(winning_squad);
    pool.status = PredictionStatus::Resolved;
    Ok(())
}
