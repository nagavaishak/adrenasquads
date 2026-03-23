use anchor_lang::prelude::*;
use crate::state::{Config, Competition, CompetitionStatus, SquadEntry};
use crate::errors::ErrorCode;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SquadScoreData {
    pub squad: Pubkey,
    pub aggregate_score: i64,
    pub member_scores: Vec<i64>,
    pub member_trade_counts: Vec<u32>,
    pub rank: u32,
    pub prize_amount: u64,
}

#[derive(Accounts)]
pub struct FinalizeRound<'info> {
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
        constraint = competition.status == CompetitionStatus::Active @ ErrorCode::CompetitionNotActive
    )]
    pub competition: Account<'info, Competition>,

    #[account(
        mut,
        constraint = squad_entry.competition == competition.key() @ ErrorCode::SquadEntryNotFound,
        constraint = !squad_entry.finalized @ ErrorCode::AlreadyFinalized
    )]
    pub squad_entry: Account<'info, SquadEntry>,
}

/// Submit scores for a single squad. Call once per squad to finalize their entry.
/// After all entries are updated, call end_competition to set the merkle root.
pub fn handler(ctx: Context<FinalizeRound>, score_data: SquadScoreData) -> Result<()> {
    require!(
        score_data.member_scores.len() == ctx.accounts.squad_entry.member_scores.len(),
        ErrorCode::ScoreMemberMismatch
    );

    let entry = &mut ctx.accounts.squad_entry;
    entry.aggregate_score = score_data.aggregate_score;
    entry.member_scores = score_data.member_scores;
    entry.member_trade_counts = score_data.member_trade_counts;
    entry.rank = score_data.rank;
    entry.prize_amount = score_data.prize_amount;
    entry.finalized = true;

    // Transition competition status to Calculating on first finalize call
    if ctx.accounts.competition.status == CompetitionStatus::Active {
        ctx.accounts.competition.status = CompetitionStatus::Calculating;
    }

    Ok(())
}
