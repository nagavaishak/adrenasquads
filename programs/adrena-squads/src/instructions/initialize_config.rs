use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::Config;

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Config::SIZE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    /// Token account that will hold squad bonds
    pub bond_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<InitializeConfig>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.next_squad_id = 0;
    config.next_competition_id = 0;
    config.bond_amount = 50_000_000; // 50 USDC
    config.prediction_fee_bps = 500; // 5%
    config.bond_vault = ctx.accounts.bond_vault.key();
    config.bump = ctx.bumps.config;
    Ok(())
}
