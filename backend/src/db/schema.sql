-- Adrena Squads PostgreSQL schema
-- Caches on-chain state for fast API queries

CREATE TABLE IF NOT EXISTS squads (
    id BIGSERIAL PRIMARY KEY,
    squad_id BIGINT UNIQUE NOT NULL,
    squad_pubkey VARCHAR(44) UNIQUE NOT NULL,
    leader_pubkey VARCHAR(44) NOT NULL,
    name VARCHAR(32) NOT NULL,
    invite_only BOOLEAN NOT NULL DEFAULT false,
    bond_deposited BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS squad_members (
    squad_pubkey VARCHAR(44) NOT NULL REFERENCES squads(squad_pubkey),
    wallet VARCHAR(44) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (squad_pubkey, wallet)
);

CREATE TABLE IF NOT EXISTS competitions (
    id BIGSERIAL PRIMARY KEY,
    competition_id BIGINT UNIQUE NOT NULL,
    competition_pubkey VARCHAR(44) UNIQUE NOT NULL,
    season_id BIGINT NOT NULL,
    round_number INT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    prize_mint VARCHAR(44) NOT NULL,
    prize_vault VARCHAR(44) NOT NULL,
    total_prize_amount BIGINT NOT NULL DEFAULT 0,
    total_squads INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Registration',
    merkle_root VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS squad_entries (
    id BIGSERIAL PRIMARY KEY,
    competition_pubkey VARCHAR(44) NOT NULL REFERENCES competitions(competition_pubkey),
    squad_pubkey VARCHAR(44) NOT NULL REFERENCES squads(squad_pubkey),
    entry_pubkey VARCHAR(44) UNIQUE NOT NULL,
    aggregate_score BIGINT NOT NULL DEFAULT 0,
    rank INT,
    prize_amount BIGINT NOT NULL DEFAULT 0,
    finalized BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (competition_pubkey, squad_pubkey)
);

CREATE TABLE IF NOT EXISTS member_scores (
    id BIGSERIAL PRIMARY KEY,
    entry_pubkey VARCHAR(44) NOT NULL REFERENCES squad_entries(entry_pubkey),
    wallet VARCHAR(44) NOT NULL,
    score BIGINT NOT NULL DEFAULT 0,
    realized_pnl_usd NUMERIC(18, 6) NOT NULL DEFAULT 0,
    max_collateral_usd NUMERIC(18, 6) NOT NULL DEFAULT 0,
    trade_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entry_pubkey, wallet)
);

CREATE TABLE IF NOT EXISTS predictions (
    id BIGSERIAL PRIMARY KEY,
    pool_pubkey VARCHAR(44) NOT NULL,
    entry_pubkey VARCHAR(44) UNIQUE NOT NULL,
    competition_pubkey VARCHAR(44) NOT NULL REFERENCES competitions(competition_pubkey),
    round_number INT NOT NULL,
    user_wallet VARCHAR(44) NOT NULL,
    squad_picked VARCHAR(44) NOT NULL,
    amount_staked BIGINT NOT NULL,
    claimed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS badges (
    id BIGSERIAL PRIMARY KEY,
    wallet VARCHAR(44) NOT NULL,
    badge_type VARCHAR(32) NOT NULL,
    competition_pubkey VARCHAR(44),
    nft_mint VARCHAR(44),
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (wallet, badge_type, competition_pubkey)
);

CREATE TABLE IF NOT EXISTS season_standings (
    id BIGSERIAL PRIMARY KEY,
    season_id BIGINT NOT NULL,
    squad_pubkey VARCHAR(44) NOT NULL REFERENCES squads(squad_pubkey),
    total_championship_points INT NOT NULL DEFAULT 0,
    rounds_completed INT NOT NULL DEFAULT 0,
    best_rank INT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (season_id, squad_pubkey)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_squad_entries_competition ON squad_entries(competition_pubkey);
CREATE INDEX IF NOT EXISTS idx_squad_entries_rank ON squad_entries(competition_pubkey, rank);
CREATE INDEX IF NOT EXISTS idx_member_scores_entry ON member_scores(entry_pubkey);
CREATE INDEX IF NOT EXISTS idx_predictions_competition ON predictions(competition_pubkey, round_number);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_wallet);
CREATE INDEX IF NOT EXISTS idx_season_standings ON season_standings(season_id, total_championship_points DESC);
