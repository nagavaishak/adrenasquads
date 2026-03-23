use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Config, PredictionPool, PredictionStatus, PredictionEntry};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct ClaimPrediction<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        constraint = prediction_pool.status == PredictionStatus::Resolved @ ErrorCode::PoolNotResolved
    )]
    pub prediction_pool: Account<'info, PredictionPool>,

    #[account(
        mut,
        seeds = [b"pred_entry", prediction_pool.key().as_ref(), user.key().as_ref()],
        bump = prediction_entry.bump,
        has_one = user,
        constraint = !prediction_entry.claimed @ ErrorCode::AlreadyClaimed
    )]
    pub prediction_entry: Account<'info, PredictionEntry>,

    #[account(
        mut,
        constraint = stake_vault.key() == prediction_pool.stake_vault
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA authority over stake vault
    #[account(
        seeds = [b"pred_auth", prediction_pool.key().as_ref()],
        bump
    )]
    pub stake_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimPrediction>) -> Result<()> {
    let winning_squad = ctx.accounts.prediction_pool.winning_squad
        .ok_or(ErrorCode::PoolNotResolved)?;

    let entry = &ctx.accounts.prediction_entry;
    require!(entry.squad_picked == winning_squad, ErrorCode::NotAWinner);

    let pool = &ctx.accounts.prediction_pool;

    // Calculate winner's share:
    // winner_share = (user_stake / total_on_winning_squad) * (total_pool * (1 - fee_bps/10000))
    let total_on_winner = pool.squad_stakes
        .iter()
        .find(|(k, _)| k == &winning_squad)
        .map(|(_, v)| *v)
        .unwrap_or(0);

    require!(total_on_winner > 0, ErrorCode::NotAWinner);

    let fee_bps = ctx.accounts.config.prediction_fee_bps as u64;
    let net_pool = pool.total_staked
        .checked_mul(10_000 - fee_bps).unwrap()
        .checked_div(10_000).unwrap();

    let payout = (entry.amount_staked as u128)
        .checked_mul(net_pool as u128).unwrap()
        .checked_div(total_on_winner as u128).unwrap() as u64;

    // Mark claimed
    ctx.accounts.prediction_entry.claimed = true;

    // Transfer payout
    let pool_key = ctx.accounts.prediction_pool.key();
    let stake_auth_bump = ctx.bumps.stake_authority;
    let seeds: &[&[u8]] = &[b"pred_auth", pool_key.as_ref(), &[stake_auth_bump]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.stake_vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.stake_authority.to_account_info(),
            },
            &[seeds],
        ),
        payout,
    )?;

    Ok(())
}
