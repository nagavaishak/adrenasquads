use anchor_lang::prelude::*;
use crate::state::{Squad, UserProfile};
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(member: Pubkey)]
pub struct KickMember<'info> {
    #[account(mut)]
    pub leader: Signer<'info>,

    #[account(
        mut,
        constraint = squad.leader == leader.key() @ ErrorCode::NotSquadLeader,
        constraint = squad.members.contains(&member) @ ErrorCode::MemberNotFound
    )]
    pub squad: Account<'info, Squad>,

    /// The kicked member's profile — must pass their key as member arg
    #[account(
        mut,
        seeds = [b"user_profile", member.as_ref()],
        bump = member_profile.bump,
    )]
    pub member_profile: Account<'info, UserProfile>,
}

pub fn handler(ctx: Context<KickMember>, member: Pubkey) -> Result<()> {
    let squad = &mut ctx.accounts.squad;
    squad.members.retain(|m| m != &member);

    let profile = &mut ctx.accounts.member_profile;
    profile.current_squad = None;

    Ok(())
}
