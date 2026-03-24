# Adrena Squads

**Team-based trading competitions + spectator prediction market for Adrena Protocol**

**Live demo:** [adrenasquads.vercel.app](https://adrenasquads.vercel.app)
**Repo:** [github.com/nagavaishak/adrenasquads](https://github.com/nagavaishak/adrenasquads)
**Program (devnet):** [`8tjeonB7WWE1S33jsXRMwmU8YhwsRGeAHa6b2Bze8Fwc`](https://explorer.solana.com/address/8tjeonB7WWE1S33jsXRMwmU8YhwsRGeAHa6b2Bze8Fwc?cluster=devnet)
**Design document:** `Adrena_Squads_Design_Document.html` (in repo root)

---

## The Problem

Adrena's competitions drove 50% of all trading volume in 2025. But they're solo-only. Solo competitions have three structural limits:

1. **No recruitment loop** -- a solo trader has no reason to bring friends
2. **Whale dominance** -- raw PnL scoring means capital wins, not skill
3. **Spectators have nothing to do** -- non-traders watch but can't participate

Every major perp DEX (Hyperliquid, dYdX, Drift) runs solo competitions. None have solved this.

## The Solution

Squads of 2-5 traders compete on **risk-adjusted % return**, not raw PnL. A $500 trader making 30% outranks a $50k whale making 20%. Skill beats capital.

Three systems working together:

**1. Squad competitions** -- Teams of 2-5 share a single score. Inactive members score 0 and drag the average down. Social accountability keeps everyone trading. Squad leaders earn a 10% bonus, creating a KOL recruitment loop.

**2. Spectator prediction market** -- Non-traders stake USDC on which squad they think will win. Pool locks when competition starts. Winners split proportionally. 5% house fee = new protocol revenue. Self-stake prevention enforced on-chain.

**3. Achievement badges** -- 6 badges (Squad Champion, Hot Streak, Diamond Hands, Perfect Round, Squad Builder, Oracle) stored as a `u64` bitmask on UserProfile. Metaplex Bubblegum compressed NFTs for portability. Progressive unlockables create long-term retention.

---

## What's Shipped

### Anchor Program -- 17 instructions, deployed to devnet

| Category | Instructions |
|---|---|
| Squad management | `create_squad` (50 USDC bond), `join_squad`, `leave_squad`, `kick_member` |
| Competition lifecycle | `create_competition`, `start_competition`, `register_squad_entry`, `finalize_round`, `end_competition` |
| Prize claims | `claim_prize` -- SHA-256 Merkle proof verification + `ClaimRecord` PDA (double-spend impossible) |
| Prediction market | `create_prediction_pool`, `place_prediction`, `lock_predictions`, `resolve_prediction`, `claim_prediction` |
| Config + Profiles | `initialize_config`, `init_user_profile` |

**Security:**
- Bond vault and prize vault use PDA-signed CPIs -- no EOA holds user funds
- `ClaimRecord` PDA with Anchor `init` makes second claims physically impossible (not just a boolean)
- Self-stake prevention: `user_profile.current_squad != Some(squad_pubkey)` enforced on-chain
- Prediction pool locks before Active phase -- no retroactive staking
- `AlreadyClaimed` guard on prediction payouts

### Scoring Engine -- live Adrena API integration

```
member_score = (realized_pnl / max_collateral) * 10,000   (basis points)
squad_score  = sum(member_scores) / total_members          (inactive = 0)
```

Calls `datapi.adrena.trade/get-positions` for open positions + `getSignaturesForAddress` with Adrena program `13gDzEXCdocbj8iAiqrScGo47NiSuYENGsRqi3SEAwet` for closed trades. SHA-256 Merkle tree builder matching on-chain verification. Express API with 7 endpoints + abuse detection (wash trading, correlated positions, prediction front-running).

### Frontend -- live at adrenasquads.vercel.app

- Squad leaderboard with live Adrena API data, rank badges, PnL bars, gold glow for #1
- Prediction market with pool distribution chart, stake inputs, wallet-connected flows
- Profile page with wallet adapter (Phantom/Solflare), 6 achievement badges
- Create Squad modal with bond deposit flow, Join Squad with wallet connect
- Dark trading-platform UI, IBM Plex Mono, animated landing page with live chart canvas
- Serverless API routes on Vercel calling Adrena's data API in real time

### Tests -- 41/41 passing

- **19 Anchor integration tests** -- full lifecycle: config -> profiles -> squads -> competition -> prediction market -> Merkle prize claims -> security edge cases
- **22 backend unit tests** -- score calculator, squad ranking, championship points, edge cases
- **5 security paths explicitly tested**: double-claim rejection, invalid Merkle proof, self-prediction block, duplicate prediction claim, bond transfer verification

### Devnet Deployment -- live on-chain

| | |
|---|---|
| Config PDA | `HhK2RgjGSbi7fZjLUVnJH5zviufx9ju4DYvjNBdf57S2` |
| Competition #1 | `3gkfqYu85nXW6rddCG5tsEJ963mQyeV866sYv2zCmH6e` (Registration phase) |
| Prize authority PDA | `8Hj7cf4SHSkvpRfKEW5KnqqYkKwwUNz96sDPcsxibCEq` |
| Bond vault | `FHvaSDmqojG8c6QzKihhGDV26uQPJrEQHTLWBhkVPYje` |
| Test USDC mint | `WxKsUrqXn2BfD69Vnpu8xpBo83VwLbhZbPLbDqh4Szo` |

### Design Document

`Adrena_Squads_Design_Document.html` in the repo root. 30+ pages covering:
- Competition format with worked scoring examples
- Full prize distribution model (5 buckets + leader bonus + season championship)
- Integration map with Mutagen, quests, streaks, raffles
- Competitive analysis vs Hyperliquid Team Odyssey, dYdX Trading League, Drift Circuit
- 8 edge cases and abuse prevention mechanisms
- Technical architecture with PDA seeds table

### Testing Report

`TESTING_REPORT.md` covers:
- Live devnet test competition run with 3 testers across 2 squads
- Tester feedback collected via Discord calls + Loom async reviews
- Issues surfaced: bond vault trust assumption, fee cap validation, wallet UX
- 10 iteration recommendations across 3 priority tiers

---

## How This Integrates With Adrena

This isn't a standalone system. It's designed to plug into Adrena's existing infrastructure:

| Adrena System | Integration Point |
|---|---|
| **datapi.adrena.trade** | Scoring engine calls `/get-positions` + `/liquidity-info` + `/pool-high-level-stats` for real-time scoring |
| **Adrena program events** | `getSignaturesForAddress` on `13gDzEXC...` parses close-position transactions for realized PnL |
| **Mutagen system** | `backend/src/mutagen/integration.ts` provides squad-based multipliers (1.5x for active squad members, 2x during competition windows) |
| **ADX buyback (10%)** | Prize pool funded from existing fee mechanism -- zero new emissions needed |
| **Quests/streaks** | Badge unlock conditions map directly to existing quest system hooks |
| **ALP staking** | Squad bond (50 USDC) could route through ALP vault for yield during competition -- noted as Phase 2 |

---

## Why Squads > Solo

| | Solo (current) | Squads (this submission) |
|---|---|---|
| Scoring | Raw PnL (whales win) | % return on collateral (skill wins) |
| Social dynamics | None | Team accountability, leader recruitment |
| Spectator engagement | Watch only | Prediction market (stake USDC, earn) |
| Recruitment | Organic only | Leader bonus = direct incentive to recruit |
| Retention | One-and-done | Badges, seasons, squad identity |
| Protocol revenue | Trading fees only | + prediction market 5% house fee |
| Inactive user cost | Nothing | Drags squad average down = social pressure |

---

## AI Agent Integration

Adrena Squads is built for the AI-agent era of DeFi. Because scoring uses **% return on collateral** — not absolute PnL — an AI trading agent competes on equal footing with any human. The protocol doesn't care who signed the transaction.

**How it works:**
- Any wallet-signing program (Solana Agent Kit agents, custom bots, or multi-sig programs) can create or join a squad
- Human + AI hybrid squads are valid — a human leader can recruit both traders and agents as members
- The squad structure provides a **social accountability layer** even for autonomous agents — a misbehaving agent drags the squad average down, creating built-in alignment pressure
- The prediction market creates a **"Human vs AI"** spectacle: non-traders can bet on whether human intuition or algorithmic precision wins the round

**Why this matters for Adrena:**
- AI agents are the fastest-growing segment of on-chain activity on Solana
- Structured competitions channel agent volume through Adrena rather than direct protocol calls
- "Human vs AI" competition outcomes are a spectator event — no other DEX has this narrative
- Agents that lose keep trading to recover their squad's score — floor on per-session volume

Two AI agent squads are live in the demo leaderboard: **Neural Edge** (rank 5, high win-rate algorithmic scalper) and **GPT-4 Momentum** (rank 7, directional trend-follower). Each has a distinct strategy fingerprint visible in the Strategy DNA radar on their squad detail page.

## Competitive Landscape

| Platform | Format | Scoring | Teams | Predictions | Trustless Claims |
|---|---|---|---|---|---|
| **Hyperliquid** | Solo leaderboard | Absolute PnL | No | No | Centralized |
| **dYdX** | Solo league, tiered | % return (volume-gated) | No | No | Centralized |
| **Drift Circuit** | Solo + season points | Points-based | No | No | Centralized |
| **GMX Blueberry Club** | Solo NFT holders only | Gated PnL | No | No | Centralized |
| **Adrena (current)** | Solo, 4 divisions | Absolute PnL (tiered) | No | No | Centralized |
| **Adrena Squads (this)** | Team-based, weekly rounds | % return (anti-whale) | **Yes (2-5)** | **Yes (USDC)** | **Yes (Merkle)** |

No Solana perp DEX has team competitions. No DEX of any kind has an integrated prediction market on competition outcomes. This is new.

---

## Projected Volume Impact

| Channel | Mechanism | Projected Impact |
|---|---|---|
| Recruitment | Each squad leader brings 3-4 new traders | +30-50% competition participants |
| Activity | Inactive = 0 score, social pressure to trade | +40-60% trades per active user |
| Spectators | Prediction market gives non-traders skin in the game | 15-25% of users engage via predictions |

**Conservative estimate:** Competition share of total volume moves from 50% to 65-75%. Prediction fees create a new revenue stream worth 5-8% on top of existing trading fees. Zero new token emissions required.

---

## Repo Map

```
adrena-squads/
├── programs/adrena-squads/   17-instruction Anchor program (Rust)
├── backend/                  Scoring engine, Merkle builder, abuse detection, Mutagen hooks
├── frontend/                 Next.js 16, wallet adapter, serverless API routes
├── tests/                    19 Anchor integration tests
├── scripts/                  Devnet bootstrap, scoring, simulation
├── Adrena_Squads_Design_Document.html
├── TESTING_REPORT.md
└── README.md
```

---

## Live Scoring

```bash
npx ts-node scripts/live-scores.ts \
  --wallets GZXqnVpZuyKWdUH34mgijxJVM1LEngoGWoJzEXtXGhBb,<wallet2>,<wallet3> \
  --squad "Alpha Wolves" --days 7 \
  --rpc https://api.mainnet-beta.solana.com
```

Outputs per-member realized PnL, trade count, score in basis points, and open position data from the live Adrena API.
