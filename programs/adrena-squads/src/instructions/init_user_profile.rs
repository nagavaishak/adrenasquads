use anchor_lang::prelude::*;
use crate::state::UserProfile;

#[derive(Accounts)]
pub struct InitUserProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = UserProfile::SIZE,
        seeds = [b"user_profile", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitUserProfile>) -> Result<()> {
    let profile = &mut ctx.accounts.user_profile;
    profile.user = ctx.accounts.user.key();
    profile.current_squad = None;
    profile.competitions_entered = 0;
    profile.squad_wins = 0;
    profile.total_squad_pnl_bps = 0;
    profile.badges = 0;
    profile.bump = ctx.bumps.user_profile;
    Ok(())
}
