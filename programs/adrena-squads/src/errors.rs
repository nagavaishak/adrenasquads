use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Wallet is already a member of a squad")]
    AlreadyInSquad,
    #[msg("Squad has reached maximum capacity (5 members)")]
    SquadFull,
    #[msg("Only the squad leader can perform this action")]
    NotSquadLeader,
    #[msg("Competition is not in Active status")]
    CompetitionNotActive,
    #[msg("Competition is not in Registration status")]
    CompetitionNotRegistration,
    #[msg("Competition is not in Calculating status")]
    CompetitionNotCalculating,
    #[msg("Round has already been finalized")]
    AlreadyFinalized,
    #[msg("Invalid Merkle proof")]
    InvalidMerkleProof,
    #[msg("Prediction pool is locked — no more bets")]
    PredictionPoolLocked,
    #[msg("Squad members cannot predict on their own squad")]
    CannotPredictOwnSquad,
    #[msg("Insufficient bond deposited")]
    InsufficientBond,
    #[msg("Member not found in squad")]
    MemberNotFound,
    #[msg("Prediction stake exceeds maximum (100 USDC)")]
    MaxPredictionExceeded,
    #[msg("Prediction pool has not been resolved")]
    PredictionNotResolved,
    #[msg("Prize has already been claimed")]
    AlreadyClaimed,
    #[msg("Competition has not started yet")]
    CompetitionNotStarted,
    #[msg("Squad name exceeds 32 characters")]
    NameTooLong,
    #[msg("Score data member count mismatch")]
    ScoreMemberMismatch,
    #[msg("Squad entry not found for this competition")]
    SquadEntryNotFound,
    #[msg("Prediction picked squad does not match entry")]
    WrongSquadPicked,
    #[msg("Prediction pool is not resolved — cannot claim")]
    PoolNotResolved,
    #[msg("You did not win this prediction")]
    NotAWinner,
    #[msg("Unauthorized — only program authority")]
    Unauthorized,
    #[msg("Competition is already finalized")]
    CompetitionFinalized,
}
