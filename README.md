# Adrena Squads

Team-based trading competition infrastructure for [Adrena Protocol](https://adrena.xyz) on Solana.

**Bounty:** Trading Competition Infrastructure
**Live demo:** https://adrenasquads.vercel.app
**Repo:** https://github.com/nagavaishak/adrenasquads

---

## Devnet Deployment

| Item | Value |
|---|---|
| **Program ID** | `8tjeonB7WWE1S33jsXRMwmU8YhwsRGeAHa6b2Bze8Fwc` |
| **Network** | Solana Devnet |
| **Explorer** | [View on Solana Explorer](https://explorer.solana.com/address/8tjeonB7WWE1S33jsXRMwmU8YhwsRGeAHa6b2Bze8Fwc?cluster=devnet) |
| **IDL account** | `79WfCnBiv31Ah2GThe8W8HPctXi3xoFKpLFL8zUfAskk` |
| **Upgrade authority** | `BkZPVAfARRCdLd6i7a1bf2RTShJBBqidSfqZtj1V32mJ` |
| **Last deployed slot** | `450570347` |
| **Config PDA** | `HhK2RgjGSbi7fZjLUVnJH5zviufx9ju4DYvjNBdf57S2` |
| **Competition #1 PDA** | `3gkfqYu85nXW6rddCG5tsEJ963mQyeV866sYv2zCmH6e` |
| **Prize authority PDA** | `8Hj7cf4SHSkvpRfKEW5KnqqYkKwwUNz96sDPcsxibCEq` |
| **Bond vault** | `FHvaSDmqojG8c6QzKihhGDV26uQPJrEQHTLWBhkVPYje` |
| **Test USDC mint** | `WxKsUrqXn2BfD69Vnpu8xpBo83VwLbhZbPLbDqh4Szo` (6 decimals) |
| **Competition status** | `Registration` — squads can call `register_squad_entry` |
| **Round** | Season 1 · Round 1 · ends 2026-03-30 |

### Verify the deployment

```bash
solana program show 8tjeonB7WWE1S33jsXRMwmU8YhwsRGeAHa6b2Bze8Fwc --url devnet
```

### Adrena API Integration

The scoring engine calls Adrena's public data API directly:

| Endpoint | Used for |
|---|---|
| `datapi.adrena.trade/get-positions?account=<wallet>` | Fetch open positions + unrealized PnL |
| `datapi.adrena.trade/liquidity-info` | AUM, ALP price, custody weights |
| `datapi.adrena.trade/pool-high-level-stats` | 24h volume, fees |

The leaderboard API route at `/api/competition/leaderboard` queries live Adrena positions, normalises PnL by collateral, and returns real-time squad scores. Falls back to demo data when no wallets have open positions.

### Initialize on devnet (one-time setup)

```bash
# Fund the deployer wallet
solana airdrop 5 BkZPVAfARRCdLd6i7a1bf2RTShJBBqidSfqZtj1V32mJ --url devnet

# Initialize the config PDA
ANCHOR_WALLET=~/.config/solana/id.json \
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
USDC_MINT=WxKsUrqXn2BfD69Vnpu8xpBo83VwLbhZbPLbDqh4Szo \
npx ts-node --transpile-only scripts/initialize.ts \
  --bond-vault FHvaSDmqojG8c6QzKihhGDV26uQPJrEQHTLWBhkVPYje
```

> **Note:** `initialize_config` currently requires ~0.002 SOL for the Config PDA rent. After initialization, `create_competition`, `create_squad`, and all other instructions are ready to use.

---

## Overview

Adrena Squads lets traders form 2–5 person teams, compete in weekly rounds, and earn USDC prizes + on-chain badges. It is built as a fully on-chain Anchor program with a Node.js scoring engine, a crank service, and a Next.js frontend.

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 16 + Tailwind v4)  port 3002             │
│  • Squad leaderboard  • Prediction market  • Badge display  │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST
┌───────────────────────────▼─────────────────────────────────┐
│  Backend (Express + TypeScript)                             │
│  • Scoring engine  • Merkle builder  • Adrena API client    │
│  • PostgreSQL  • Crank service (lifecycle + scoring)        │
└───────────────────────────┬─────────────────────────────────┘
                            │ Anchor RPC
┌───────────────────────────▼─────────────────────────────────┐
│  Anchor Program (Rust)  adrena_squads                       │
│  • Squad PDAs  • Competition lifecycle  • Prediction market │
│  • Merkle-proof prize claims  • Badge bitmask               │
└─────────────────────────────────────────────────────────────┘
```

---

## Repo Structure

```
adrena-squads/
├── programs/adrena-squads/   Anchor program (Rust)
│   └── src/
│       ├── lib.rs            Program entry points (17 instructions)
│       ├── errors.rs         Custom error codes
│       ├── state/            Account structs (config, squad, competition, …)
│       └── instructions/     One file per instruction
├── tests/
│   └── adrena-squads.ts      Full-lifecycle integration tests (Mocha)
├── backend/
│   ├── src/
│   │   ├── scoring/          Score calculator + Adrena API client + trade parser
│   │   ├── leaderboard/      Merkle tree builder
│   │   ├── db/               PostgreSQL schema
│   │   └── index.ts          Express API server
│   └── tests/
│       └── scoring.test.ts   22 scoring unit tests (Jest) — all passing
├── frontend/                 Next.js app (see frontend/README if any)
└── scripts/
    ├── initialize.ts         One-time: creates Config PDA + bond vault
    ├── create-test-competition.ts  Create a round in Registration phase
    └── simulate-round.ts     Fetch trades → score → finalize → end competition
```

---

## Architecture

### Anchor Program (17 instructions)

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
member_score  = (sum_realized_pnl / max_collateral_in_single_trade) × 10 000
squad_score   = sum(member_scores, inactive = 0) / total_members
```

All scores are in **basis points** (signed `i64` on-chain). Inactive members (zero trades) drag the squad average down — teams are incentivized to keep all members active.

### Prize Distribution (Merkle)

1. Crank fetches all closed positions via Adrena's data API + `getSignaturesForAddress`
2. Computes member/squad scores, ranks, prize amounts
3. Calls `finalize_round` once per squad → competition transitions to `Calculating`
4. Builds a SHA-256 Merkle tree of `(wallet, amount)` leaves
5. Calls `end_competition(merkle_root)` → competition is `Finalized`
6. Each winner submits their proof via `claim_prize` — no trusted distributor needed

### Prediction Market

Users stake USDC on which squad they think will win. Pool is locked when the competition starts. Winners share the pot proportionally (5% fee to house), claimed via `claim_prediction`.

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

## Quick Start

### Prerequisites

- Rust (Solana SBF toolchain)
- Anchor CLI 0.32.0 (`avm use 0.32.0`)
- Node.js ≥ 18, Yarn
- Solana CLI 3.x (`solana config set --url devnet`)

### Build & test the program

```bash
cd adrena-squads

# Build
anchor build

# Run integration tests (spins up local validator)
anchor test
```

### Run backend unit tests

```bash
cd backend
npm install
npm test
# → 22 tests, all passing
```

### Run Anchor integration tests

```bash
cd adrena-squads
anchor test
# → 19 tests, all passing
# Covers: config → profiles → competition lifecycle →
#         prediction market (place/lock/resolve/claim) →
#         prize claims with Merkle proofs + ClaimRecord double-spend guard
```

### Deploy to devnet

```bash
# 1. Build the program
anchor build

# 2. Deploy
anchor deploy --provider.cluster devnet

# 3. Initialize (one-time)
ANCHOR_WALLET=~/.config/solana/id.json \
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
npx ts-node scripts/initialize.ts

# 4. Create a test competition (7-day round)
ANCHOR_WALLET=~/.config/solana/id.json \
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
npx ts-node scripts/create-test-competition.ts \
  --prize-vault <vault-owned-by-prize-auth-pda>

# 5. After the round, simulate scoring + finalize
ANCHOR_WALLET=~/.config/solana/id.json \
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
npx ts-node scripts/simulate-round.ts \
  --competition <competition-pda>
```

### Run the frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:3002
```

---

## API Endpoints (Backend)

| Method | Path | Description |
|---|---|---|
| GET | `/api/squads` | All squads |
| GET | `/api/squads/:id` | Squad + member details |
| GET | `/api/competition` | Current competition |
| GET | `/api/competition/leaderboard` | Ranked squad scores |
| GET | `/api/predictions/:round` | Prediction pool for a round |
| GET | `/api/profile/:wallet` | User profile + badges |
| POST | `/api/scores/calculate` | Trigger score recalculation (crank) |

---

## Scoring Unit Tests

```
calculateMemberScore
  ✓ returns zero score for empty trade list
  ✓ computes score = (realizedPnl / maxCollateral) × 10000
  ✓ uses max single-trade collateral as the denominator
  ✓ handles negative PnL (loss)
  ✓ handles mixed wins and losses
  ✓ returns 0 score when maxCollateral is 0
  ✓ rounds the score to the nearest integer
calculateSquadScore
  ✓ returns zero for empty member list
  ✓ averages member scores across all members
  ✓ inactive members (0 trades) count as 0 and drag the average down
  ✓ squad with all-inactive members scores 0
  ✓ single active member propagates score divided by total members
  ✓ preserves squadId, squadPubkey, and memberScores
rankSquads
  ✓ ranks squads in descending score order
  ✓ assigns 1-based ranks
  ✓ does not mutate the original array order
  ✓ handles a single squad / empty array / ties
rankToChampionshipPoints
  ✓ top-5 / ranks 6–10 / rank 11+

22 passing
```

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

Badge state is stored as a `u64` bitmask on `UserProfile`, with Metaplex Bubblegum compressed NFT minting via the crank.

---

## Security Notes

- Bond vault and prize vault use PDA-signed CPIs — no user funds held by EOA
- Merkle proof verification uses SHA-256 (matching `solana_program::hash::hashv`)
- Prediction pool is locked before competition goes Active — no retroactive staking
- `claim_prize` is double-spend safe via a `ClaimRecord` PDA (`["claim", competition, claimant]`) — Anchor's `init` constraint guarantees one-time initialization; any second claim attempt is rejected before execution
- `claim_prediction` uses a `claimed` boolean on `PredictionEntry` — duplicate claims are rejected with `AlreadyClaimed`
- Prediction self-stake prevention: `user_profile.current_squad != Some(squad_pubkey)` enforced on-chain

## Testing

Full test results, simulated competition walkthrough, and user feedback are documented in [`TESTING_REPORT.md`](./TESTING_REPORT.md).

**Test summary:**
- Backend scoring unit tests: **22 / 22 passing**
- Anchor integration tests: **19 / 19 passing** (full lifecycle + prediction market + security paths)
