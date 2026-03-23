use anchor_lang::prelude::*;
use crate::state::{Squad, UserProfile, Competition, CompetitionStatus};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct LeaveSquad<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        constraint = squad.members.contains(&user.key()) @ ErrorCode::MemberNotFound
    )]
    pub squad: Account<'info, Squad>,

    #[account(
        mut,
        seeds = [b"user_profile", user.key().as_ref()],
        bump = user_profile.bump,
        constraint = user_profile.current_squad == Some(squad.key()) @ ErrorCode::MemberNotFound
    )]
    pub user_profile: Account<'info, UserProfile>,

    /// Can only leave during Registration phase
    #[account(
        constraint = competition.status == CompetitionStatus::Registration @ ErrorCode::CompetitionNotRegistration
    )]
    pub competition: Account<'info, Competition>,
}

pub fn handler(ctx: Context<LeaveSquad>) -> Result<()> {
    let squad = &mut ctx.accounts.squad;
    let user_key = ctx.accounts.user.key();

    // Leaders cannot leave — they must disband instead
    require!(squad.leader != user_key, ErrorCode::NotSquadLeader);

    squad.members.retain(|m| m != &user_key);

    let profile = &mut ctx.accounts.user_profile;
    profile.current_squad = None;

    Ok(())
}
