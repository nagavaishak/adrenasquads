use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::{Config, Competition, CompetitionStatus};
use crate::errors::ErrorCode;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CompetitionParams {
    pub season_id: u64,
    pub round_number: u32,
    pub start_time: i64,
    pub end_time: i64,
    pub total_prize_amount: u64,
}

#[derive(Accounts)]
pub struct CreateCompetition<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = authority,
        space = Competition::SIZE,
        seeds = [b"competition", config.next_competition_id.to_le_bytes().as_ref()],
        bump
    )]
    pub competition: Account<'info, Competition>,

    pub prize_mint: Account<'info, Mint>,

    /// Token account that will hold prize funds for this competition
    #[account(
        constraint = prize_vault.mint == prize_mint.key()
    )]
    pub prize_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateCompetition>, params: CompetitionParams) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let comp_id = config.next_competition_id;

    let competition = &mut ctx.accounts.competition;
    competition.competition_id = comp_id;
    competition.authority = ctx.accounts.authority.key();
    competition.season_id = params.season_id;
    competition.round_number = params.round_number;
    competition.start_time = params.start_time;
    competition.end_time = params.end_time;
    competition.prize_mint = ctx.accounts.prize_mint.key();
    competition.prize_vault = ctx.accounts.prize_vault.key();
    competition.total_prize_amount = params.total_prize_amount;
    competition.total_squads = 0;
    competition.status = CompetitionStatus::Registration;
    competition.merkle_root = [0u8; 32];
    competition.bump = ctx.bumps.competition;

    config.next_competition_id += 1;

    Ok(())
}
