use anchor_lang::prelude::*;
use crate::state::{Squad, UserProfile, Competition, CompetitionStatus};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct JoinSquad<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        constraint = squad.members.len() < Squad::MAX_MEMBERS @ ErrorCode::SquadFull,
        constraint = !squad.invite_only @ ErrorCode::Unauthorized
    )]
    pub squad: Account<'info, Squad>,

    #[account(
        mut,
        seeds = [b"user_profile", user.key().as_ref()],
        bump = user_profile.bump,
        constraint = user_profile.current_squad.is_none() @ ErrorCode::AlreadyInSquad
    )]
    pub user_profile: Account<'info, UserProfile>,

    /// The active competition — must still be in Registration
    #[account(
        constraint = competition.status == CompetitionStatus::Registration @ ErrorCode::CompetitionNotRegistration
    )]
    pub competition: Account<'info, Competition>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<JoinSquad>) -> Result<()> {
    let squad = &mut ctx.accounts.squad;
    let user_key = ctx.accounts.user.key();

    squad.members.push(user_key);

    let profile = &mut ctx.accounts.user_profile;
    profile.current_squad = Some(squad.key());

    Ok(())
}
