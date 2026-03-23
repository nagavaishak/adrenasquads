use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Config, Squad, UserProfile};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct CreateSquad<'info> {
    #[account(mut)]
    pub leader: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = leader,
        space = Squad::SIZE,
        seeds = [b"squad", config.next_squad_id.to_le_bytes().as_ref()],
        bump
    )]
    pub squad: Account<'info, Squad>,

    #[account(
        mut,
        seeds = [b"user_profile", leader.key().as_ref()],
        bump = user_profile.bump,
        constraint = user_profile.current_squad.is_none() @ ErrorCode::AlreadyInSquad
    )]
    pub user_profile: Account<'info, UserProfile>,

    /// Leader's USDC token account (bond source)
    #[account(mut)]
    pub leader_token_account: Account<'info, TokenAccount>,

    /// Program bond vault
    #[account(
        mut,
        constraint = bond_vault.key() == config.bond_vault
    )]
    pub bond_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateSquad>, name: String, invite_only: bool) -> Result<()> {
    require!(name.len() <= Squad::MAX_NAME_LEN, ErrorCode::NameTooLong);

    let config = &mut ctx.accounts.config;
    let squad_id = config.next_squad_id;

    // Transfer bond from leader to bond vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.leader_token_account.to_account_info(),
                to: ctx.accounts.bond_vault.to_account_info(),
                authority: ctx.accounts.leader.to_account_info(),
            },
        ),
        config.bond_amount,
    )?;

    let squad = &mut ctx.accounts.squad;
    squad.squad_id = squad_id;
    squad.leader = ctx.accounts.leader.key();
    squad.members = vec![ctx.accounts.leader.key()];
    squad.name = name;
    squad.invite_only = invite_only;
    squad.bond_deposited = true;
    squad.created_at = Clock::get()?.unix_timestamp;
    squad.bump = ctx.bumps.squad;

    // Update user profile
    let profile = &mut ctx.accounts.user_profile;
    profile.current_squad = Some(squad.key());

    // Increment squad counter
    config.next_squad_id += 1;

    emit!(SquadCreated {
        squad_id,
        leader: ctx.accounts.leader.key(),
        name: squad.name.clone(),
    });

    Ok(())
}

#[event]
pub struct SquadCreated {
    pub squad_id: u64,
    pub leader: Pubkey,
    pub name: String,
}
