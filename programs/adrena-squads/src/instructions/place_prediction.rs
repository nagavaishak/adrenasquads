use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Competition, CompetitionStatus, PredictionPool, PredictionStatus, PredictionEntry, UserProfile};
use crate::errors::ErrorCode;

pub const MAX_PREDICTION_STAKE: u64 = 100_000_000; // 100 USDC

#[derive(Accounts)]
#[instruction(squad_pubkey: Pubkey, amount: u64)]
pub struct PlacePrediction<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        constraint = competition.status == CompetitionStatus::Registration
            || competition.status == CompetitionStatus::Active
            @ ErrorCode::CompetitionNotActive
    )]
    pub competition: Account<'info, Competition>,

    #[account(
        mut,
        seeds = [b"prediction", competition.key().as_ref(), competition.round_number.to_le_bytes().as_ref()],
        bump = prediction_pool.bump,
        constraint = prediction_pool.status == PredictionStatus::Open @ ErrorCode::PredictionPoolLocked
    )]
    pub prediction_pool: Account<'info, PredictionPool>,

    /// Ensure user is not predicting on their own squad
    #[account(
        seeds = [b"user_profile", user.key().as_ref()],
        bump = user_profile.bump,
        constraint = user_profile.current_squad != Some(squad_pubkey) @ ErrorCode::CannotPredictOwnSquad
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = user,
        space = PredictionEntry::SIZE,
        seeds = [b"pred_entry", prediction_pool.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub prediction_entry: Account<'info, PredictionEntry>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = stake_vault.key() == prediction_pool.stake_vault
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PlacePrediction>, squad_pubkey: Pubkey, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InsufficientBond);
    require!(amount <= MAX_PREDICTION_STAKE, ErrorCode::MaxPredictionExceeded);

    // Transfer stake to vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.stake_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;

    // Record prediction entry
    let entry = &mut ctx.accounts.prediction_entry;
    entry.pool = ctx.accounts.prediction_pool.key();
    entry.user = ctx.accounts.user.key();
    entry.squad_picked = squad_pubkey;
    entry.amount_staked = amount;
    entry.claimed = false;
    entry.bump = ctx.bumps.prediction_entry;

    // Update pool totals
    let pool = &mut ctx.accounts.prediction_pool;
    pool.total_staked += amount;

    // Update or insert squad stake
    if let Some(entry) = pool.squad_stakes.iter_mut().find(|(k, _)| k == &squad_pubkey) {
        entry.1 += amount;
    } else {
        pool.squad_stakes.push((squad_pubkey, amount));
    }

    Ok(())
}
