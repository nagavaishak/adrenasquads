# Adrena Squads

The first team-based trading competition system for a Solana perp DEX. Squads of 2-5 traders compete on risk-adjusted % return, with an integrated prediction market and on-chain achievement badges.

[![Tests](https://img.shields.io/badge/tests-41%2F41%20passing-brightgreen)]() [![Solana](https://img.shields.io/badge/solana-devnet-blueviolet)]() [![Anchor](https://img.shields.io/badge/anchor-0.32.0-blue)]()

**Live demo:** [adrenasquads.vercel.app](https://adrenasquads.vercel.app)
**Program:** [`8tjeonB7WWE...8Fwc`](https://explorer.solana.com/address/8tjeonB7WWE1S33jsXRMwmU8YhwsRGeAHa6b2Bze8Fwc?cluster=devnet) on Solana Devnet

---

## What This Solves

Adrena's competitions drove 50% of all trading volume in 2025. But they're solo-only. Squad mechanics unlock three new growth channels:

1. **Recruitment multiplier** -- every squad leader recruits 3-4 members who wouldn't have competed alone. Deribit's Team Odyssey saw 40% more unique traders during team events.
2. **Activity frequency** -- inactive members score 0 and drag the squad average down. Social accountability keeps all members trading.
3. **Spectator retention** -- the prediction market gives non-traders a reason to engage. 5% house fee = new protocol revenue.

Scoring uses **% return on collateral**, not absolute PnL. A trader risking $500 and making $150 (30%) outranks a whale risking $50k and making $10k (20%). Skill beats capital.

---

## What's Built

| Layer | What | Status |
|---|---|---|
| **Anchor program** | 17 instructions -- squad lifecycle, competitions, Merkle prize claims, prediction market | Deployed to devnet |
| **Scoring engine** | Calls `datapi.adrena.trade` for live positions, computes risk-adjusted scores | Working |
| **Merkle distribution** | SHA-256 tree + on-chain proof verification, `ClaimRecord` PDA prevents double-claims | Tested |
| **Prediction market** | USDC staking, proportional payouts, 5% fee, self-stake prevention | On-chain |
| **Frontend** | Next.js 16 -- leaderboard, predictions, badges, profile, wallet connect (Phantom/Solflare), Strategy DNA radar | Live |
| **AI Agent Squads** | Any wallet-signing program can join a squad -- % return scoring is agent-neutral | Live in demo |
| **Devnet faucet** | `/api/faucet` mints 100 test USDC to any wallet for end-to-end testing | Live |
| **Tests** | 19 Anchor integration + 22 backend unit tests (41 total, all passing) | Passing |

---

## Devnet Deployment

| Item | Value |
|---|---|
| **Program ID** | `8tjeonB7WWE1S33jsXRMwmU8YhwsRGeAHa6b2Bze8Fwc` |
| **Network** | Solana Devnet |
| **Explorer** | [View on Solana Explorer](https://explorer.solana.com/address/8tjeonB7WWE1S33jsXRMwmU8YhwsRGeAHa6b2Bze8Fwc?cluster=devnet) |
| **Config PDA** | `HhK2RgjGSbi7fZjLUVnJH5zviufx9ju4DYvjNBdf57S2` |
| **Competition #1 PDA** | `3gkfqYu85nXW6rddCG5tsEJ963mQyeV866sYv2zCmH6e` |
| **Prize authority PDA** | `8Hj7cf4SHSkvpRfKEW5KnqqYkKwwUNz96sDPcsxibCEq` |
| **Bond vault** | `FHvaSDmqojG8c6QzKihhGDV26uQPJrEQHTLWBhkVPYje` |
| **Test USDC mint** | `WxKsUrqXn2BfD69Vnpu8xpBo83VwLbhZbPLbDqh4Szo` (6 decimals) |
| **Competition status** | `Registration` -- squads can call `register_squad_entry` |

```bash
# Verify
solana program show 8tjeonB7WWE1S33jsXRMwmU8YhwsRGeAHa6b2Bze8Fwc --url devnet
```

### Adrena API Integration

The scoring engine calls Adrena's data API directly:

| Endpoint | Used for |
|---|---|
| `datapi.adrena.trade/get-positions?account=<wallet>` | Open positions + unrealized PnL |
| `datapi.adrena.trade/liquidity-info` | AUM, ALP price, custody weights |
| `datapi.adrena.trade/pool-high-level-stats` | 24h volume, fees |

The leaderboard route at `/api/competition/leaderboard` queries live Adrena positions, normalises PnL by collateral, and returns real-time squad scores. Falls back to demo data when no wallets have open positions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
|  Frontend (Next.js 16 + Tailwind v4)                        |
|  Leaderboard | Predictions | Badges | Strategy DNA Radar    |
|  Wallet Adapter | AI Agent squad filter                     |
└───────────────────────────┬─────────────────────────────────┘
                            | same-origin fetch
┌───────────────────────────▼─────────────────────────────────┐
|  API Routes (Next.js serverless — deployed on Vercel)       |
|  /api/competition  /api/squads  /api/predictions/[round]    |
|  /api/competition/leaderboard  /api/profile/[wallet]        |
|  /api/faucet  (mints devnet test USDC for judges/testers)   |
|  Scoring engine | Merkle builder | Adrena API client        |
|  Abuse detection | Mutagen hooks                            |
└───────────────────────────┬─────────────────────────────────┘
                            | @solana/web3.js + Anchor RPC
┌───────────────────────────▼─────────────────────────────────┐
|  Anchor Program (Rust)  adrena_squads                       |
|  17 instructions | 9 PDA types | Merkle verification        |
|  Squad lifecycle | Competition FSM | Prediction market       |
└─────────────────────────────────────────────────────────────┘
```

### Program Instructions (17)

| Category | Instructions |
|---|---|
| Config | `initialize_config` |
| User profiles | `init_user_profile` |
| Squad management | `create_squad`, `join_squad`, `leave_squad`, `kick_member` |
| Competition lifecycle | `create_competition`, `start_competition`, `register_squad_entry`, `finalize_round`, `end_competition` |
| Prize claims | `claim_prize` (Merkle proof) |
| Prediction market | `create_prediction_pool`, `place_prediction`, `lock_predictions`, `resolve_prediction`, `claim_prediction` |

### Scoring Formula

```
member_score  = (sum_realized_pnl / max_collateral_in_single_trade) * 10,000
squad_score   = sum(member_scores, inactive = 0) / total_members
```

Scores are **basis points** (signed `i64` on-chain). Inactive members score 0 and drag the average down -- teams must keep everyone trading.

### Prize Distribution (Merkle)

1. Crank fetches closed positions via `datapi.adrena.trade` + `getSignaturesForAddress`
2. Computes scores, ranks, prize amounts
3. Calls `finalize_round` per squad (Active -> Calculating)
4. Builds SHA-256 Merkle tree of `(wallet, amount)` leaves
5. Calls `end_competition(merkle_root)` (Calculating -> Finalized)
6. Each winner claims with `claim_prize(proof)` -- trustless, no intermediary

### Prediction Market

Users stake USDC on which squad wins. Pool locks when competition starts. Winners split the pot proportionally (5% fee). Self-stake prevention enforced on-chain.

---

## PDA Seeds

| Account | Seeds |
|---|---|
| Config | `["config"]` |
| Squad | `["squad", squad_id as le64]` |
| UserProfile | `["user_profile", user_pubkey]` |
| Competition | `["competition", competition_id as le64]` |
| SquadEntry | `["squad_entry", competition_pubkey, squad_pubkey]` |
| PredictionPool | `["prediction", competition_pubkey, round_num as le32]` |
| PredictionEntry | `["pred_entry", pool_pubkey, user_pubkey]` |
| PrizeAuthority | `["prize_auth", competition_pubkey]` |
| ClaimRecord | `["claim", competition_pubkey, claimant_pubkey]` |

---

## Repo Structure

```
adrena-squads/
├── programs/adrena-squads/   Anchor program (Rust)
|   └── src/
|       ├── lib.rs            17 instruction entry points
|       ├── errors.rs         22 custom error codes
|       ├── state/            8 account structs (config, squad, competition, ...)
|       └── instructions/     One file per instruction
├── tests/
|   └── adrena-squads.ts      19 integration tests (Mocha) -- full lifecycle
├── backend/
|   ├── src/
|   |   ├── scoring/          Score calculator + Adrena API client + trade parser
|   |   ├── leaderboard/      Merkle tree builder + ranker
|   |   ├── analytics/        Abuse detection (wash trading, correlated trades)
|   |   ├── mutagen/          Adrena Mutagen integration hooks
|   |   ├── db/               PostgreSQL schema + queries
|   |   └── index.ts          Express API server (7 endpoints)
|   └── tests/
|       └── scoring.test.ts   22 scoring unit tests (Jest) -- all passing
├── frontend/                 Next.js 16 app
|   ├── app/                  Pages: landing, squads, squads/[id], predict, profile
|   ├── app/api/              Serverless API routes (competition, leaderboard, predictions, faucet)
|   ├── lib/adrena-program.ts On-chain tx builder — create_squad, init_user_profile
|   └── components/           Leaderboard, SquadCard, BadgeGrid, StrategyRadar, WalletProvider, ...
└── scripts/
    ├── initialize.ts         Creates Config PDA + bond vault
    ├── create-test-competition.ts
    ├── simulate-round.ts     Full round: fetch -> score -> finalize -> end
    └── live-scores.ts        Score real Adrena traders from mainnet
```

---

## Quick Start

### Prerequisites

- Rust (Solana SBF toolchain)
- Anchor CLI 0.32.0 (`avm use 0.32.0`)
- Node.js >= 18, Yarn
- Solana CLI 3.x (`solana config set --url devnet`)

### Build & test

```bash
# Anchor program
anchor build
anchor test          # 19 tests, all passing

# Backend scoring engine
cd backend && npm install && npm test   # 22 tests, all passing

# Frontend
cd frontend && npm install && npm run dev   # http://localhost:3002
```

### Deploy to devnet

```bash
anchor build
anchor deploy --provider.cluster devnet

ANCHOR_WALLET=~/.config/solana/id.json \
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
npx ts-node --transpile-only scripts/initialize.ts \
  --bond-vault FHvaSDmqojG8c6QzKihhGDV26uQPJrEQHTLWBhkVPYje

npx ts-node --transpile-only scripts/create-test-competition.ts \
  --prize-vault <vault-owned-by-prize-auth-pda>
```

---

## AI Agent Squads

Because scoring uses **% return on collateral** — not absolute PnL — an AI trading agent competes on equal footing with any human wallet. The program has no concept of "human vs bot": it scores any signing pubkey the same way.

Any Solana Agent Kit agent, custom trading bot, or multi-sig program can `create_squad` or `join_squad`. The squad structure provides a social accountability layer even for autonomous agents — a misbehaving agent drags the squad average down, creating built-in alignment pressure.

The demo leaderboard includes two AI-powered squads with distinct strategy profiles:
- **Neural Edge** (rank 5) — high win-rate algorithmic scalper, 95% asset diversification
- **GPT-4 Momentum** (rank 7) — directional trend-follower, 5ms average hold time

Filter by `⬡ AI` on the squads page to see agent squads only.

---

## Devnet Faucet

Judges and testers can get free test USDC without a separate drip service:

```bash
curl -X POST https://adrenasquads.vercel.app/api/faucet \
  -H "Content-Type: application/json" \
  -d '{"wallet": "<your-devnet-wallet>"}'
# → mints 100 USDC to your wallet ATA
# → returns { success, signature, explorerUrl }
```

Or use the **"+ GET 100 USDC"** button inside the Create Squad modal on the live site.

---

## Badges

| Badge | Unlock Condition |
|---|---|
| Squad Champion | Finish #1 in a competition |
| Hot Streak | Win 3 consecutive rounds |
| Diamond Hands | Longest single-position hold |
| Perfect Round | All 5 members active in a round |
| Squad Builder | Create a squad with 5 members |
| Oracle | Predict the winner 3 rounds in a row |

Badge state is a `u64` bitmask on `UserProfile`, with Metaplex Bubblegum compressed NFT minting via the crank.

---

## Security

- Bond vault and prize vault use PDA-signed CPIs -- no user funds held by EOA
- Merkle proof verification uses SHA-256 (`solana_program::hash::hashv`)
- Prediction pool locks before competition goes Active -- no retroactive staking
- `claim_prize` is double-spend safe via `ClaimRecord` PDA -- Anchor's `init` constraint makes second claims physically impossible
- `claim_prediction` uses `claimed` boolean on `PredictionEntry`
- Self-stake prevention: `user_profile.current_squad != Some(squad_pubkey)` enforced on-chain
- Abuse detection engine flags wash trading, correlated positions, and prediction front-running

---

## Testing

Full results in [`TESTING_REPORT.md`](./TESTING_REPORT.md):

- **22 / 22** backend scoring unit tests passing
- **19 / 19** Anchor integration tests passing
- **5 / 5** security paths verified (double-claim, invalid proof, self-prediction, duplicate claim, bond transfer)
- Live devnet test competition run with 3 testers across 2 squads
- Tester feedback collected and documented with iteration recommendations
