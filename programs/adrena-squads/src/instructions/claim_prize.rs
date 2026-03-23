use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use solana_program::hash::hashv;
use crate::state::{Competition, CompetitionStatus, ClaimRecord};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,

    #[account(
        seeds = [b"competition", competition.competition_id.to_le_bytes().as_ref()],
        bump = competition.bump,
        constraint = competition.status == CompetitionStatus::Finalized @ ErrorCode::CompetitionNotActive
    )]
    pub competition: Account<'info, Competition>,

    /// Initialized on the very first claim; its existence rejects any repeat claim.
    #[account(
        init,
        payer = claimant,
        space = ClaimRecord::SIZE,
        seeds = [b"claim", competition.key().as_ref(), claimant.key().as_ref()],
        bump
    )]
    pub claim_record: Account<'info, ClaimRecord>,

    /// Prize vault PDA
    #[account(
        mut,
        constraint = prize_vault.key() == competition.prize_vault
    )]
    pub prize_vault: Account<'info, TokenAccount>,

    /// Claimant's USDC token account
    #[account(
        mut,
        constraint = claimant_token_account.owner == claimant.key()
    )]
    pub claimant_token_account: Account<'info, TokenAccount>,

    /// PDA authority over the prize vault
    /// CHECK: validated by seeds
    #[account(
        seeds = [b"prize_auth", competition.key().as_ref()],
        bump
    )]
    pub prize_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<ClaimPrize>,
    amount: u64,
    proof: Vec<[u8; 32]>,
) -> Result<()> {
    // Compute leaf: sha256(claimant || amount)
    let leaf = hashv(&[
        ctx.accounts.claimant.key().as_ref(),
        &amount.to_le_bytes(),
    ]).to_bytes();

    // Verify Merkle proof
    let root = ctx.accounts.competition.merkle_root;
    verify_merkle_proof(leaf, &proof, root)?;

    // Record the claim — `init` above already guarantees this only runs once.
    // If the account already exists, Anchor rejects the tx before we reach here.
    let record = &mut ctx.accounts.claim_record;
    record.competition = ctx.accounts.competition.key();
    record.claimant = ctx.accounts.claimant.key();
    record.amount = amount;
    record.bump = ctx.bumps.claim_record;

    // Transfer from prize vault to claimant
    let competition_key = ctx.accounts.competition.key();
    let prize_auth_bump = ctx.bumps.prize_authority;
    let seeds: &[&[u8]] = &[
        b"prize_auth",
        competition_key.as_ref(),
        &[prize_auth_bump],
    ];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.prize_vault.to_account_info(),
                to: ctx.accounts.claimant_token_account.to_account_info(),
                authority: ctx.accounts.prize_authority.to_account_info(),
            },
            &[seeds],
        ),
        amount,
    )?;

    Ok(())
}

fn verify_merkle_proof(leaf: [u8; 32], proof: &[[u8; 32]], root: [u8; 32]) -> Result<()> {
    let mut computed = leaf;
    for sibling in proof {
        computed = if computed <= *sibling {
            hashv(&[&computed, sibling.as_ref()]).to_bytes()
        } else {
            hashv(&[sibling.as_ref(), &computed]).to_bytes()
        };
    }
    require!(computed == root, ErrorCode::InvalidMerkleProof);
    Ok(())
}
