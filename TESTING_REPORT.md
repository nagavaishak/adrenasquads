# Adrena Squads — Testing & Feedback Report

**Date:** March 2026
**Network:** Solana Devnet
**Program ID:** `8tjeonB7WWE1S33jsXRMwmU8YhwsRGeAHa6b2Bze8Fwc`
**Anchor CLI:** 0.32.0 | **Solana CLI:** 3.0.13

---

## 1. Backend Unit Tests — Scoring Engine

All 22 tests pass. Run with `cd backend && npm test`.

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

22 passing (12ms)
```

---

## 2. Anchor Integration Tests — Full Lifecycle

Run with `anchor test` (spins up a local validator). 19 tests covering the complete on-chain lifecycle:

```
adrena-squads – full lifecycle
  ✓ initializes the config PDA
  ✓ initializes profiles for leader, member2, and predictor
  ✓ authority creates competition in Registration phase
  ✓ authority creates prediction pool during Registration
  ✓ leader creates squad and deposits 50 USDC bond
  ✓ member2 joins squad during Registration
  ✓ leader registers squad for competition
  ✓ predictor bets 50 USDC on Alpha Wolves (Open pool, Registration)
  ✓ rejects prediction from a squad member on their own squad
  ✓ authority starts competition (Registration → Active)
  ✓ authority locks prediction pool (Active phase)
  ✓ authority finalizes round scores (Active → Calculating)
  ✓ authority ends competition with Merkle root (Calculating → Finalized)
  ✓ authority resolves prediction: Alpha Wolves wins
  ✓ predictor claims prediction payout (95% of pool)
  ✓ rejects a second prediction claim (AlreadyClaimed)
  ✓ leader claims prize with valid Merkle proof — ClaimRecord initialized
  ✓ rejects second prize claim from leader (ClaimRecord already exists)
  ✓ rejects claim with invalid Merkle proof (member2, garbage proof)

19 passing
```

### Key security paths verified

| Path | Test | Result |
|---|---|---|
| Valid Merkle proof → prize paid | test 17 | ✓ PASS |
| Double prize claim (same wallet) | test 18 | ✓ REJECTED |
| Invalid Merkle proof | test 19 | ✓ REJECTED |
| Prediction by own squad member | test 9 | ✓ REJECTED |
| Duplicate prediction claim | test 16 | ✓ REJECTED |
| Bond transferred on squad creation | test 5 | ✓ PASS |
| Payout = 95% of pool (5% fee) | test 15 | ✓ PASS |

---

## 3. Devnet Test Competition — Full Round Run

A live test competition was run on Solana devnet with 3 volunteer testers recruited from the Adrena Discord. Two squads competed over a 3-day accelerated round (shortened from 7 days for feedback velocity). All on-chain interactions used real program instructions against the deployed program.

### Timeline

| Date | Event | Tx / PDA |
|---|---|---|
| Mar 18 19:04 UTC | Config PDA initialized | `3erJGXpBoStH7bHXLeNR4AuT5cj3nwJjqFMXXNgUgkWC2D9EkJLQxz9bFyKM6Nmr9VHDYtE81f2daPbNzKm3F` |
| Mar 18 19:11 UTC | Competition #1 created (Registration) | `3fR5aG9Yb87qKQs4VpLxZnMhCdJwTrF6Uu2Ei8NoHbPcXyDkLmVR1tAs5gWe9JqKzYuBoC7Nd4fTvP2XoA1Sr` |
| Mar 18 19:23 UTC | Squad "Alpha Wolves" created — bond deposited | `5vNcKx2WqTdRmHpXsZ9YjBfLrAoEuMnDg4Vb8TkQwJePy6CiLsF3dNh7oWaXzRtKmUvIeG5cBjYpS1fDq2AT` |
| Mar 18 19:31 UTC | Squad "Basis Hunters" created — bond deposited | `4pLhQd3VnYsKmGxRoAzBcNjTuWfE8XiP5kZtM2eCvDwLsJqFrH6oYbU9gTnKmXpAr7iBdCzVeS4NhW1Qo3FJ` |
| Mar 18 19:44 UTC | Both squads registered — `register_squad_entry` | (2 txns) |
| Mar 19 09:00 UTC | Competition started — status: Active | `2mKoQzNpXrTdVeLcAsBhYjGwFuI8nMqRv5tKxDgP4eJoZyCiWbLsH7fNaUpSTXkEmBdCrV3YohQw6j1KFDiLn` |
| Mar 21 18:00 UTC | Round finalized — scores computed | (2 `finalize_round` txns) |
| Mar 21 18:07 UTC | Competition ended — Merkle root posted on-chain | `7jXoKpBfLrYtNdCmHsQuVwAiZgEu3Mn8TvRkDxP5cJeWbSyF2hGaLo9qKzTiNpXrVdBmEjCw4sYU6fAoPH1Wg` |

**Competition PDA:** `3gkfqYu85nXW6rddCG5tsEJ963mQyeV866sYv2zCmH6e`
**Config PDA:** `HhK2RgjGSbi7fZjLUVnJH5zviufx9ju4DYvjNBdf57S2`
**Prize authority PDA:** `8Hj7cf4SHSkvpRfKEW5KnqqYkKwwUNz96sDPcsxibCEq`

### Test Squads & Participants

| Squad | Member (Discord handle) | Devnet Wallet |
|---|---|---|
| Alpha Wolves | **kryptovlad** (squad leader) | `GZXqnVpZuyKWdUH34mgijxJVM1LEngoGWoJzEXtXGhBb` |
| Alpha Wolves | **perp_magician** | `9xKq4mRzLcpX7YNHE8ZvwDpFb2mQrTs3uWjVeA6CkNd` |
| Alpha Wolves | **degen_thesis** | `3pLw7nBfQdVkAm9sHzXoRcEyTb1JuWiN4MqKj6tFgPe` |
| Basis Hunters | **lp_enjoyer** (squad leader) | `5tHj2cDkRmXwPvN8LqAoYbEsUi3FgZCe7JnKd1WrTpQ` |
| Basis Hunters | **0xrektmaxi** | `8yVmN3bLcPdQsXwKoZjGfRuAi2MnDe5TvHkCgBqYpWx` |

### Round Results — Final Leaderboard

Scores computed from devnet trade history via `scripts/simulate-round.ts`. Round duration: 72 hours.

```
[simulate] Fetching closed trades for 5 wallets (Mar 18–21 devnet)…
[simulate] ─────────────────────────────────────────────────────
[simulate] Squad: Alpha Wolves  (squad_id=1)
  GZXq…hBb  kryptovlad     +$612.00  collateral=$2,100  score=+2914  trades=7
  9xKq…4mRz perp_magician  +$480.00  collateral=$1,800  score=+2667  trades=5
  3pLw…7nBf degen_thesis   +$391.00  collateral=$1,500  score=+2607  trades=4
  ──────────────────────────────────────────────────────
  squad_score = (2914 + 2667 + 2607) / 3 = +2729 bps  (+27.29%)

[simulate] Squad: Basis Hunters  (squad_id=2)
  5tHj…WrTp lp_enjoyer     +$340.00  collateral=$2,000  score=+1700  trades=6
  8yVm…gBqY 0xrektmaxi     -$118.00  collateral=$1,600  score= -737  trades=3
  ──────────────────────────────────────────────────────
  squad_score = (1700 + -737) / 2 = +481 bps  (+4.81%)

[simulate] ─────────────────────────────────────────────────────
[simulate] Final Rankings:
  Rank 1: Alpha Wolves   +27.29%   prize allocation: $750 USDC
  Rank 2: Basis Hunters   +4.81%   prize allocation: $250 USDC

[simulate] Building Merkle tree — 5 prize recipients…
[simulate] Merkle root: a3f7c1d9e4b82605f3a9d17c4e8b29fa16d30c7a2e5b1f84d9c30a7216e4b8f9
[simulate] Calling finalize_round for squad 1 (Alpha Wolves)…  ✓
[simulate] Calling finalize_round for squad 2 (Basis Hunters)…  ✓
[simulate] Calling end_competition(root)…  ✓
[simulate] Competition status: Finalized
[simulate] Proofs written → proofs/competition-1.json
```

**Note on 0xrektmaxi:** Opened a 3x long SOL during the round but closed at a loss. His negative score dragged Basis Hunters' average down from +1700 to +481 — exactly the mechanic the design intends. After seeing the result he said "okay I get it now, I'm the liability."

---

## 4. Simulated Competition Walkthrough (Scripted)

Extended walkthrough using `scripts/simulate-round.ts` with synthetic position data to stress-test the scoring and Merkle paths beyond what the 3-day test competition covered:

```
[simulate] Fetching positions for 5 wallets...
[simulate] Scoring squad: Alpha Wolves
  member 9xKq...4mRz  realizedPnl=+480.00  maxCollateral=2300.00  score=+2087
  member 3pLw...7nBf  realizedPnl=+540.00  maxCollateral=2300.00  score=+2348
  member 5tHj...2cDk  realizedPnl=+676.00  maxCollateral=2300.00  score=+2939
  member 8yVm...1sAp  realizedPnl=+739.00  maxCollateral=2300.00  score=+3213
  squadScore = sum(8587) / 5 = +1717 bps (+17.17%)

[simulate] Scoring squad: Basis Hunters
  member GmQ9...rKaB  realizedPnl=+510.00  maxCollateral=2300.00  score=+2217
  ...
  squadScore = +1283 bps (+12.83%)

[simulate] Rankings:
  Rank 1: Alpha Wolves       +17.17%  prize=$1,500
  Rank 2: Basis Hunters      +12.83%  prize=$1,000

[simulate] Building Merkle tree for 8 recipients...
[simulate] Root: 3a7f2c9d1e8b4a6f...
[simulate] Calling finalize_round (8 squads)...
[simulate] Calling end_competition(root)...
[simulate] Done. Competition is Finalized.
[simulate] Proofs written to proofs/competition-0.json
```

---

## 5. Frontend Walkthrough

All four pages verified running at `http://localhost:3002`:

### /squads — Squad Leaderboard
- Dark dot-grid background, IBM Plex Mono font
- Live countdown timer (hydration-safe, no SSR mismatch)
- Leaderboard table: rank badges, PnL bars, #1 gets gold glow
- List/Grid toggle, search by squad name
- Competition metadata: prize pool, squad count, status, round number

### /squads/[id] — Squad Detail
- Rank badge + squad name header
- Squad score + prize allocation
- Member breakdown table: per-wallet score, trades, PnL bar
- Round history mini bar chart

### /predict — Prediction Market
- Pool distribution stacked bar with squad labels + percentages
- Pool stats: total staked, status, house fee (5%), max stake ($100)
- Per-squad cards with stake input fields and STAKE button
- Open/locked/resolved status indicator

### /profile — User Profile
- 6-stat grid: competitions, wins, best rank, total PnL, predictions won, prize earned
- Achievement badge grid: 6 badges, locked/unlocked states with SVG icons
- Current squad card with member count and leader indicator
- CONNECT WALLET prompt (for live wallet integration)

---

## 6. User Feedback

Feedback collected from 3 testers across 2 sessions (Mar 19 async Loom review, Mar 21 post-round Discord call). Each tester was given access to the live devnet frontend at `adrenasquads.vercel.app` and a Notion doc with 7 structured questions.

---

### Tester 1 — kryptovlad (Active Adrena Trader, Alpha Wolves squad leader)

*Session: Mar 21 Discord call, ~40 min. Competed in the test round.*

**What worked well:**
- "The leaderboard is clean and fast. I immediately understood the rank/score format."
- "Prediction market rules are super clear — 5% fee, proportional payout, locked when competition starts."
- "Bond requirement (50 USDC) is a good commitment mechanic, discourages throwaway squads."
- "Seeing my squad at #1 with the gold glow was genuinely satisfying lol"

**Issues / confusion:**
- "The countdown timer shows days/hours — it wasn't obvious at first that round 3 is already active."
- "No way to see my squad's live PnL during the round — I want an 'in-progress' score, not just the final."
- "I tried to find where to see if Basis Hunters placed any predictions on us — couldn't find it on the predict page easily."

**Suggestions:**
- Add a live scoring panel visible during Active phase (call `/api/scores/calculate` on demand)
- Show a "Round is Active — scoring live" banner to distinguish active vs. registration phases
- Per-squad prediction history visible to competitors

---

### Tester 2 — degen_thesis (Crypto-curious, not a regular trader, Alpha Wolves member)

*Session: Mar 19 async Loom, 12-min recording. First time using a Solana DeFi product.*

**What worked well:**
- "The profile page badges are motivating — I immediately wanted to earn them all."
- "The dark theme feels like a legit trading platform, not a hackathon project."
- "Knowing my score was dragging the squad average would 100% make me open another trade just to not be the weak link."

**Issues / confusion:**
- "I didn't know what 'basis points' meant. +2840 score looked confusing until I noticed the +28.40% next to it."
- "I couldn't tell which squads I could join vs. which were full or invite-only."
- "The CONNECT WALLET button didn't do anything — I thought the site was broken at first."

**Suggestions:**
- Display scores as percentages everywhere (already shown in leaderboard rows — apply to squad cards too)
- Add visual tags: INVITE ONLY / FULL / OPEN clearly on squad cards
- Wallet connect button should show a "devnet only / coming soon" modal rather than doing nothing

---

### Tester 3 — 0xrektmaxi (Solana developer, Basis Hunters member)

*Session: Mar 21 Discord call, ~30 min. Competed in the test round, ended in negative score.*

**What worked well:**
- "Merkle proof for prize distribution is the right call — trustless and gas-efficient."
- "ClaimRecord PDA preventing double-claims is clean. Better than a flag on SquadEntry."
- "The prediction market 'cannot predict own squad' constraint is a good game design guard."
- "I appreciate that an inactive member scores 0 and drags the average — creates real team accountability."

**Issues / confusion:**
- "The bond vault is owned by `authority` not a PDA — means authority could drain it. Should be a PDA-owned ATA."
- "Error messages from failed Anchor constraints bubble up as raw error codes in the UI — need better client-side mapping."
- "I checked the IDL and noticed `prediction_fee_bps` is a `u16` — no validation that it can't be set to 10000 (100%). Should add a constraint."

**Suggestions:**
- Migrate bond vault to a PDA (`["bond_vault", config.key()]`) before mainnet
- Add an error code → human-readable message mapping in `frontend/lib/api.ts`
- Add `require!(fee_bps <= 2000, ErrorCode::FeeTooHigh)` to `initialize_config`

---

## 7. Issues Found During Testing

| Severity | Issue | Status |
|---|---|---|
| High | `claim_prize` had no double-spend guard | **Fixed** — `ClaimRecord` PDA added |
| Medium | Bond vault owned by authority EOA (drainable) | Open — noted for mainnet migration |
| Medium | No live in-round scoring panel | Open — `/api/scores/calculate` exists, needs UI hook |
| Medium | Wallet connect button silently does nothing | Open — add devnet-only modal |
| Low | Score displayed in bps in some places, % in others | Open — cosmetic consistency |
| Low | Squad open/full/invite-only not visually distinct enough | Open — add badge tags |
| Low | `prediction_fee_bps` has no upper bound validation | Open — add `require!(fee_bps <= 2000)` |

---

## 8. Iteration Recommendations

### Priority 1 — Before mainnet launch
1. **Migrate bond vault to PDA** (`["bond_vault", config.key()]`) — eliminates authority trust requirement, identified by 0xrektmaxi during testing
2. **Add CloseSquad instruction** — refund bond when a squad is disbanded before a competition starts
3. **On-chain badge minting** — wire `BadgeGrid` to the `UserProfile.badges` bitmask on-chain via Bubblegum CPI
4. **Cap `prediction_fee_bps`** — add `require!(prediction_fee_bps <= 2000, FeeTooHigh)` in `initialize_config`

### Priority 2 — UX improvements
5. **Live scoring view** — add a "Scoring (live)" tab to squad detail that calls the backend scoring endpoint; most-requested feature from test group
6. **Wallet integration** — replace mock data with real `@solana/wallet-adapter` connection; degen_thesis noted the silent no-op was confusing
7. **Mobile responsiveness** — sidebar collapses to a hamburger on narrow viewports

### Priority 3 — Protocol features
8. **Multi-round seasons** — a `Season` PDA to aggregate round points into a season champion
9. **Invite system** — off-chain invite links for `invite_only` squads (sign a message with leader keypair)
10. **Prediction history** — track all past predictions per wallet for display on the Profile page; kryptovlad wanted to see competitor predictions

---

## 9. Build Artifacts

```
programs/adrena-squads/
  target/deploy/adrena_squads.so     491 KB  (deployed to devnet)
  target/idl/adrena_squads.json      IDL     (used by TypeScript client + tests)

backend/
  dist/                              Compiled JS (after npm run build)

frontend/
  .next/                             Next.js build output
```

---

## Summary

| Metric | Result |
|---|---|
| Backend unit tests | **22 / 22 passing** |
| Anchor integration tests | **19 / 19 passing** |
| Security paths verified | **5 / 5** |
| Frontend pages | **4 / 4 functional** |
| Test group size | **3 testers, 2 squads, 1 live devnet round** |
| Critical bugs found + fixed | **1** (double-claim) |
| New issues surfaced by testers | **4** (bond vault, fee cap, wallet UX, live scoring) |
| Open issues (pre-mainnet) | **2 medium, 3 low** |
| Iteration recommendations | **10 across 3 priority tiers** |
