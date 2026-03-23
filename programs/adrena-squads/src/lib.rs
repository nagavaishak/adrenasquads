use anchor_lang::prelude::*;

pub mod errors;
pub mod state;
pub mod instructions;

// Re-export all instruction modules' public items (including generated __client_accounts_*)
// so that Anchor's #[program] macro can resolve them via crate::.
pub use instructions::initialize_config::*;
pub use instructions::init_user_profile::*;
pub use instructions::create_squad::*;
pub use instructions::join_squad::*;
pub use instructions::leave_squad::*;
pub use instructions::kick_member::*;
pub use instructions::create_competition::*;
pub use instructions::start_competition::*;
pub use instructions::register_squad_entry::*;
pub use instructions::finalize_round::*;
pub use instructions::end_competition::*;
pub use instructions::claim_prize::*;
pub use instructions::create_prediction_pool::*;
pub use instructions::place_prediction::*;
pub use instructions::lock_predictions::*;
pub use instructions::resolve_prediction::*;
pub use instructions::claim_prediction::*;

declare_id!("8tjeonB7WWE1S33jsXRMwmU8YhwsRGeAHa6b2Bze8Fwc");

#[program]
pub mod adrena_squads {
    use super::*;

    // ── Config ──────────────────────────────────────────────────────────────

    /// One-time program initialization. Creates the global Config PDA.
    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        instructions::initialize_config::handler(ctx)
    }

    // ── User Profiles ────────────────────────────────────────────────────────

    /// Creates a UserProfile PDA for the signer. Must be called before any squad action.
    pub fn init_user_profile(ctx: Context<InitUserProfile>) -> Result<()> {
        instructions::init_user_profile::handler(ctx)
    }

    // ── Squad Management ─────────────────────────────────────────────────────

    /// Create a squad and deposit the 50 USDC bond.
    pub fn create_squad(ctx: Context<CreateSquad>, name: String, invite_only: bool) -> Result<()> {
        instructions::create_squad::handler(ctx, name, invite_only)
    }

    /// Join an open squad (competition must be in Registration phase).
    pub fn join_squad(ctx: Context<JoinSquad>) -> Result<()> {
        instructions::join_squad::handler(ctx)
    }

    /// Leave a squad (only during Registration phase; leaders cannot leave).
    pub fn leave_squad(ctx: Context<LeaveSquad>) -> Result<()> {
        instructions::leave_squad::handler(ctx)
    }

    /// Leader removes an inactive member.
    pub fn kick_member(ctx: Context<KickMember>, member: Pubkey) -> Result<()> {
        instructions::kick_member::handler(ctx, member)
    }

    // ── Competition Lifecycle ─────────────────────────────────────────────────

    /// Authority creates a new competition round.
    pub fn create_competition(ctx: Context<CreateCompetition>, params: CompetitionParams) -> Result<()> {
        instructions::create_competition::handler(ctx, params)
    }

    /// Transitions Registration → Active when Clock >= start_time.
    pub fn start_competition(ctx: Context<StartCompetition>) -> Result<()> {
        instructions::start_competition::handler(ctx)
    }

    /// Leader registers their squad for a competition.
    pub fn register_squad_entry(ctx: Context<RegisterSquadEntry>) -> Result<()> {
        instructions::register_squad_entry::handler(ctx)
    }

    /// Authority submits finalized scores for a single squad (call once per squad).
    pub fn finalize_round(ctx: Context<FinalizeRound>, score_data: SquadScoreData) -> Result<()> {
        instructions::finalize_round::handler(ctx, score_data)
    }

    /// Authority sets the Merkle root and transitions to Finalized.
    pub fn end_competition(ctx: Context<EndCompetition>, merkle_root: [u8; 32]) -> Result<()> {
        instructions::end_competition::handler(ctx, merkle_root)
    }

    /// Claimant submits a Merkle proof to withdraw their prize.
    pub fn claim_prize(ctx: Context<ClaimPrize>, amount: u64, proof: Vec<[u8; 32]>) -> Result<()> {
        instructions::claim_prize::handler(ctx, amount, proof)
    }

    // ── Prediction Market ────────────────────────────────────────────────────

    /// Authority creates a prediction pool for the round.
    pub fn create_prediction_pool(ctx: Context<CreatePredictionPool>) -> Result<()> {
        instructions::create_prediction_pool::handler(ctx)
    }

    /// User stakes USDC on a squad to win the round.
    pub fn place_prediction(ctx: Context<PlacePrediction>, squad_pubkey: Pubkey, amount: u64) -> Result<()> {
        instructions::place_prediction::handler(ctx, squad_pubkey, amount)
    }

    /// Authority locks the prediction pool when competition starts.
    pub fn lock_predictions(ctx: Context<LockPredictions>) -> Result<()> {
        instructions::lock_predictions::handler(ctx)
    }

    /// Authority resolves the prediction pool with the winning squad.
    pub fn resolve_prediction(ctx: Context<ResolvePrediction>, winning_squad: Pubkey) -> Result<()> {
        instructions::resolve_prediction::handler(ctx, winning_squad)
    }

    /// Winning predictor claims their proportional share (minus 5% fee).
    pub fn claim_prediction(ctx: Context<ClaimPrediction>) -> Result<()> {
        instructions::claim_prediction::handler(ctx)
    }
}
