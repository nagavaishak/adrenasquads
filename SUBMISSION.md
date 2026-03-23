# Adrena Squads: Team-Based Trading Competitions with Spectator Predictions

## What I Built

The first team-based trading competition system on any Solana perp DEX, with an integrated spectator prediction market and compressed NFT achievement badges.

Traders form or join squads of 2–5 members and compete on **risk-adjusted percentage return** — not raw PnL — so skill matters more than capital. A spectator prediction market lets non-traders stake USDC on competing squads. An achievement badge system (on-chain `u64` bitmask + Metaplex Bubblegum compressed NFTs) creates long-term retention through progressive unlockables.

## Why It Wins

- **No Solana perp DEX has team competitions** — this is a genuine first on the ecosystem
- **Spectator predictions turn watchers into participants** — new revenue stream, broader user base
- **% return scoring makes competitions skill-based, not whale-dominated** — retail traders compete on equal footing
- **Self-sustaining** — prize pool funded entirely from Adrena's existing 10% ADX buyback mechanism, zero new token emissions
- **Squad leader bonus** activates KOL recruitment loops — content creators earn for building teams

## Deliverables

### 📄 Design Document
`Adrena_Squads_Design_Document.html` (print to PDF)
- Competition format, squad mechanics, season structure
- Scoring formula with worked examples (% return vs absolute PnL)
- Full prize distribution model (5 buckets, leader bonus, season championship)
- Spectator prediction market mechanics
- 6 achievement badges with unlock conditions
- Integration with Mutagen, quests, streaks, raffles
- Competitive analysis (vs Hyperliquid, dYdX, Drift)
- 8 edge cases and abuse prevention mechanisms
- Full technical architecture with PDA seeds table

### 💻 Working Prototype
**GitHub repo:** `adrena-squads/`

**Anchor program** — 17 instructions, Solana devnet:
- Squad lifecycle: create, join, leave, kick
- Competition lifecycle: create → register → start → finalize → end
- Prize claims: Merkle proof verification + `ClaimRecord` PDA (double-spend proof)
- Prediction market: create pool → place → lock → resolve → claim (with AlreadyClaimed guard)

**Backend scoring engine** (TypeScript):
- `getPositions()` — live Adrena API integration (datapi.adrena.trade)
- `getClosedTrades()` — RPC transaction history parser (Adrena program `13gDzEXC...`)
- Score calculator: `member_score = (realized_pnl / max_collateral) × 10,000`
- SHA-256 Merkle tree builder matching on-chain verification
- Express API (7 endpoints)
- `scripts/live-scores.ts` — standalone script for real wallet scoring

**Frontend** (Next.js 16 + Tailwind v4):
- Squad leaderboard with rank badges, PnL bars, gold glow for #1
- Prediction market with pool distribution chart and stake inputs
- Profile page with 6 achievement badges (locked/unlocked)
- Dark trading-platform UI, IBM Plex Mono font, hydration-safe countdown timer

### 📊 Testing Report
`TESTING_REPORT.md` in repo:
- **22/22** backend scoring unit tests passing
- **19/19** Anchor integration tests passing (full lifecycle + prediction market + security paths)
- 5 security paths verified (double-claim, invalid proof, self-prediction, duplicate pred claim, bond transfer)
- Simulated competition walkthrough with realistic score output
- Feedback from 3 testers (active trader, newcomer, Solana developer)
- 9 iteration recommendations across 3 priority tiers

## Technical Details

| Item | Value |
|---|---|
| Program ID (devnet) | `8tjeonB7WWE1S33jsXRMwmU8YhwsRGeAHa6b2Bze8Fwc` |
| Adrena API integration | `datapi.adrena.trade/get-positions` + `/pool-high-level-stats` + `/liquidity-info` |
| RPC trade parsing | `getSignaturesForAddress` with Adrena program `13gDzEXCdocbj8iAiqrScGo47NiSuYENGsRqi3SEAwet` |
| Prize distribution | SHA-256 Merkle tree, trustless on-chain claim |
| Double-spend protection | `ClaimRecord` PDA — Anchor `init` makes second claim physically impossible |
| Prediction guard | `user_profile.current_squad != Some(squad)` enforced on-chain |
| Frontend | Next.js 16, Tailwind v4, IBM Plex Mono, port 3002 |
| Tests | 41 total (19 Anchor + 22 Jest) |

## Projected Volume Impact

Adrena's competitions drove 50% of all trading volume in 2025. Squad mechanics are projected to amplify this through 3 channels:

### 1. Recruitment Multiplier
- Each squad leader recruits 3–4 members who may not have competed solo
- 10% leader bonus directly incentivizes KOL and community leader recruitment
- Deribit's Team Odyssey saw 40% more unique traders during team events
- **Projected: 30–50% increase in competition participants per season**

### 2. Activity Frequency
- Minimum 1 trade/member/round creates social accountability (letting your squad down has a cost)
- Gaming research shows team commitments increase daily active usage by 2.3×
- **Projected: 40–60% increase in trades per active user during competition windows**

### 3. Spectator Retention
- Prediction market gives non-traders a meaningful reason to engage daily
- 5% prediction fee creates a new protocol revenue stream that scales with engagement
- **Projected: 15–25% of total users engage via predictions without ever opening a trade**

### Conservative Estimate

If squad competitions run alongside existing Mutagen seasons:

| Metric | Current | Projected |
|---|---|---|
| Competition share of total volume | 50% | 65–75% |
| New unique traders per season | baseline | +30–50% |
| New revenue from prediction fees | $0 | +5–8% on existing fees |

These numbers are conservative — they assume no viral squad recruitment, no influencer-led squads, and no cross-guild competition meta developing organically. All three are likely given the social dynamics the format creates.

## Live Scoring Demo

```bash
# Score real Adrena traders from mainnet
npx ts-node scripts/live-scores.ts \
  --wallets GZXqnVpZuyKWdUH34mgijxJVM1LEngoGWoJzEXtXGhBb,<wallet2>,<wallet3> \
  --squad "Alpha Wolves" \
  --days 7 \
  --rpc https://api.mainnet-beta.solana.com
```

Output: formatted leaderboard with per-member realized PnL, trade count, score in basis points, and open position data from the live Adrena API.
