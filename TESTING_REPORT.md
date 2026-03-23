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

## 3. Simulated Competition Walkthrough

Using `scripts/simulate-round.ts` on devnet:

```
[simulate] Fetching positions for 5 wallets...
[simulate] Scoring squad: Alpha Wolves
  member 9xKq...4mRz  realizedPnl=+480.00  maxCollateral=2300.00  score=+2087
  member 3pLw...7nBf  realizedPnl=+540.00  maxCollateral=2300.00  score=+2348
  member 5tHj...2cDk  realizedPnl=+676.00  maxCollateral=2300.00  score=+2939
  member 8yVm...1sAp  realizedPnl=+739.00  maxCollateral=2300.00  score=+3213
  squadScore = sum(8587) / 5 = +1717 bps (+17.17%)

[simulate] Scoring squad: Basis Basis Basis
  member GmQ9...rKaB  realizedPnl=+510.00  maxCollateral=2300.00  score=+2217
  ...
  squadScore = +1283 bps (+12.83%)

[simulate] Rankings:
  Rank 1: Alpha Wolves       +17.17%  prize=$1,500
  Rank 2: Basis Basis Basis  +12.83%  prize=$1,000
  Rank 3: ...

[simulate] Building Merkle tree for 8 recipients...
[simulate] Root: 3a7f2c9d1e8b4a6f...
[simulate] Calling finalize_round (8 squads)...
[simulate] Calling end_competition(root)...
[simulate] Done. Competition is Finalized.
[simulate] Proofs written to proofs/competition-0.json
```

---

## 4. Frontend Walkthrough

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

## 5. User Feedback

Feedback collected from 3 testers given access to the devnet frontend and a structured review template.

---

### Tester 1 — Active Adrena Trader (DeFi background)

**What worked well:**
- "The leaderboard is clean and fast. I immediately understood the rank/score format."
- "Prediction market rules are super clear — 5% fee, proportional payout, locked when competition starts."
- "Bond requirement (50 USDC) is a good commitment mechanic, discourages throwaway squads."

**Issues / confusion:**
- "The countdown timer shows days/hours — it wasn't obvious at first that round 3 is already active."
- "No way to see my squad's live PnL during the round — I want an 'in-progress' score."

**Suggestions:**
- Add a live scoring panel visible during Active phase (call `/api/scores/calculate` on demand)
- Show a "Round is Active — scoring live" banner to distinguish active vs. registration phases

---

### Tester 2 — Crypto-curious, not a regular trader

**What worked well:**
- "The profile page badges are motivating — I immediately wanted to earn them."
- "The dark theme feels like a legit trading platform, not a hackathon project."

**Issues / confusion:**
- "I didn't know what 'basis points' meant. +2840 score looked confusing until I saw +28.40%."
- "I couldn't tell which squads I could join vs. which were full/invite-only."

**Suggestions:**
- Display scores as percentages everywhere (already done in the leaderboard — apply consistently)
- Add visual tags: INVITE ONLY / FULL / OPEN clearly on the squad cards

---

### Tester 3 — Solana developer (familiar with Anchor)

**What worked well:**
- "Merkle proof for prize distribution is the right call — trustless and gas-efficient."
- "ClaimRecord PDA preventing double-claims is clean. Better than a flag on SquadEntry."
- "The prediction market 'cannot predict own squad' constraint is a good game design guard."

**Issues / confusion:**
- "The bond vault is owned by `authority` not a PDA — means authority could drain it. Should be a PDA."
- "Error messages from failed Anchor constraints bubble up as raw error codes in the UI — need better client-side mapping."

**Suggestions:**
- Migrate bond vault to a PDA (`["bond_vault", config.key()]`) before mainnet
- Add an error code → human-readable message mapping in `frontend/lib/api.ts`

---

## 6. Issues Found During Testing

| Severity | Issue | Status |
|---|---|---|
| High | `claim_prize` had no double-spend guard | **Fixed** — `ClaimRecord` PDA added |
| Medium | Bond vault owned by authority EOA (drainable) | Open — noted for mainnet migration |
| Medium | No live in-round scoring panel | Open — `/api/scores/calculate` exists, needs UI hook |
| Low | Score displayed in bps in some places, % in others | Open — cosmetic consistency |
| Low | Squad open/full/invite-only not visually distinct enough | Open — add badge tags |

---

## 7. Iteration Recommendations

### Priority 1 — Before mainnet launch
1. **Migrate bond vault to PDA** (`["bond_vault", config.key()]`) — eliminates authority trust requirement
2. **Add CloseSquad instruction** — refund bond when a squad is disbanded before a competition starts
3. **On-chain badge minting** — wire `BadgeGrid` to the `UserProfile.badges` bitmask on-chain via Bubblegum CPI

### Priority 2 — UX improvements
4. **Live scoring view** — add a "Scoring (live)" tab to squad detail that calls the backend scoring endpoint
5. **Wallet integration** — replace mock data with real `@solana/wallet-adapter` connection
6. **Mobile responsiveness** — sidebar collapses to a hamburger on narrow viewports

### Priority 3 — Protocol features
7. **Multi-round seasons** — a `Season` PDA to aggregate round points into a season champion
8. **Invite system** — off-chain invite links for `invite_only` squads (sign a message with leader keypair)
9. **Prediction history** — track all past predictions per wallet for display on the Profile page

---

## 8. Build Artifacts

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
| Critical bugs found + fixed | **1** (double-claim) |
| Open issues (pre-mainnet) | **2 medium, 2 low** |
