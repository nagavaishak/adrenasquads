use anchor_lang::prelude::*;
use crate::state::{Competition, CompetitionStatus, Squad, SquadEntry, UserProfile};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct RegisterSquadEntry<'info> {
    #[account(mut)]
    pub leader: Signer<'info>,

    #[account(
        mut,
        constraint = competition.status == CompetitionStatus::Registration @ ErrorCode::CompetitionNotRegistration
    )]
    pub competition: Account<'info, Competition>,

    #[account(
        constraint = squad.leader == leader.key() @ ErrorCode::NotSquadLeader,
        constraint = squad.bond_deposited @ ErrorCode::InsufficientBond
    )]
    pub squad: Account<'info, Squad>,

    #[account(
        seeds = [b"user_profile", leader.key().as_ref()],
        bump = user_profile.bump,
        constraint = user_profile.current_squad == Some(squad.key()) @ ErrorCode::MemberNotFound
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = leader,
        space = SquadEntry::SIZE,
        seeds = [b"squad_entry", competition.key().as_ref(), squad.key().as_ref()],
        bump
    )]
    pub squad_entry: Account<'info, SquadEntry>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterSquadEntry>) -> Result<()> {
    let entry = &mut ctx.accounts.squad_entry;
    entry.competition = ctx.accounts.competition.key();
    entry.squad = ctx.accounts.squad.key();
    entry.aggregate_score = 0;
    entry.member_scores = vec![0i64; ctx.accounts.squad.members.len()];
    entry.member_trade_counts = vec![0u32; ctx.accounts.squad.members.len()];
    entry.rank = 0;
    entry.prize_amount = 0;
    entry.finalized = false;
    entry.bump = ctx.bumps.squad_entry;

    ctx.accounts.competition.total_squads += 1;

    Ok(())
}
