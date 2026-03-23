use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::{Config, Competition, CompetitionStatus, PredictionPool, PredictionStatus};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct CreatePredictionPool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    #[account(
        constraint = competition.status == CompetitionStatus::Registration @ ErrorCode::CompetitionNotRegistration
    )]
    pub competition: Account<'info, Competition>,

    #[account(
        init,
        payer = authority,
        space = PredictionPool::SIZE,
        seeds = [b"prediction", competition.key().as_ref(), competition.round_number.to_le_bytes().as_ref()],
        bump
    )]
    pub prediction_pool: Account<'info, PredictionPool>,

    /// Token account that will hold prediction stakes
    pub stake_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreatePredictionPool>) -> Result<()> {
    let pool = &mut ctx.accounts.prediction_pool;
    pool.competition = ctx.accounts.competition.key();
    pool.round_number = ctx.accounts.competition.round_number;
    pool.total_staked = 0;
    pool.squad_stakes = Vec::new();
    pool.status = PredictionStatus::Open;
    pool.winning_squad = None;
    pool.stake_vault = ctx.accounts.stake_vault.key();
    pool.bump = ctx.bumps.prediction_pool;
    Ok(())
}
