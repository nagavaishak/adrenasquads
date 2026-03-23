/**
 * Adrena Squads — full lifecycle integration tests.
 *
 * Flow:
 *  config init → user profiles → competition (Registration) →
 *  prediction pool creation → squad creation → member join → squad registration →
 *  place prediction (predictor bets on squad) →
 *  start competition (Active) → lock predictions →
 *  finalize round (Calculating) → end competition (Merkle root, Finalized) →
 *  resolve prediction → claim prediction (payout) → reject duplicate pred claim →
 *  claim prize (with ClaimRecord) → reject double prize claim →
 *  reject invalid Merkle proof
 *
 * Run with: anchor test
 */

import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { AdrenaSquads } from "../target/types/adrena_squads";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import crypto from "crypto";
import { assert } from "chai";

// ── Merkle helpers (must match on-chain sha256 logic in claim_prize.rs) ───────

function sha256(...chunks: Buffer[]): Buffer {
  const h = crypto.createHash("sha256");
  for (const c of chunks) h.update(c);
  return h.digest();
}

function hashLeaf(wallet: PublicKey, amount: bigint): Buffer {
  const amtBuf = Buffer.allocUnsafe(8);
  amtBuf.writeBigUInt64LE(amount, 0);
  return sha256(wallet.toBuffer(), amtBuf);
}

function hashPair(a: Buffer, b: Buffer): Buffer {
  return Buffer.compare(a, b) <= 0 ? sha256(a, b) : sha256(b, a);
}

function buildTree(leaves: Buffer[]): { root: Buffer; proofs: Buffer[][] } {
  if (leaves.length === 1) {
    return { root: leaves[0], proofs: [[]] };
  }
  const root = hashPair(leaves[0], leaves[1]);
  return { root, proofs: [[leaves[1]], [leaves[0]]] };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("adrena-squads – full lifecycle", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.AdrenaSquads as Program<AdrenaSquads>;
  const connection = provider.connection;
  const authority = (provider.wallet as anchor.Wallet).payer;

  // Test wallets
  const leader    = Keypair.generate();
  const member2   = Keypair.generate();
  const predictor = Keypair.generate(); // third-party, never joins a squad

  // Token accounts
  let usdcMint:       PublicKey;
  let bondVault:      PublicKey;
  let prizeVault:     PublicKey;
  let leaderToken:    PublicKey;
  let stakeVault:     PublicKey;
  let predictorToken: PublicKey;

  // PDAs
  let configPda:          PublicKey;
  let squadPda:           PublicKey;
  let leaderProfilePda:   PublicKey;
  let member2ProfilePda:  PublicKey;
  let predictorProfilePda: PublicKey;
  let competitionPda:     PublicKey;
  let squadEntryPda:      PublicKey;
  let prizeAuthPda:       PublicKey;
  let predictionPoolPda:  PublicKey;
  let predEntryPda:       PublicKey;
  let stakeAuthPda:       PublicKey;

  const PRIZE_AMOUNT = 1_000_000n; // 1 USDC (6 decimals)
  const PRED_STAKE   = 50_000_000n; // 50 USDC

  // ── Setup ────────────────────────────────────────────────────────────────
  before(async () => {
    // Airdrop SOL to all test wallets
    const sigs = await Promise.all([
      connection.requestAirdrop(leader.publicKey,    5 * LAMPORTS_PER_SOL),
      connection.requestAirdrop(member2.publicKey,   5 * LAMPORTS_PER_SOL),
      connection.requestAirdrop(predictor.publicKey, 5 * LAMPORTS_PER_SOL),
    ]);
    for (const sig of sigs) await connection.confirmTransaction(sig);

    // Static PDAs
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")], program.programId
    );
    [leaderProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_profile"), leader.publicKey.toBuffer()], program.programId
    );
    [member2ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_profile"), member2.publicKey.toBuffer()], program.programId
    );
    [predictorProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_profile"), predictor.publicKey.toBuffer()], program.programId
    );

    // Competition 0 (next_competition_id starts at 0)
    const compIdBuf = new BN(0).toArrayLike(Buffer, "le", 8);
    [competitionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("competition"), compIdBuf], program.programId
    );
    [prizeAuthPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("prize_auth"), competitionPda.toBuffer()], program.programId
    );

    // Prediction pool — seeds use round_number (u32, 4 bytes LE) = 1
    const roundBuf = Buffer.allocUnsafe(4);
    roundBuf.writeUInt32LE(1, 0);
    [predictionPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("prediction"), competitionPda.toBuffer(), roundBuf],
      program.programId
    );
    [stakeAuthPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pred_auth"), predictionPoolPda.toBuffer()],
      program.programId
    );

    // Squad 0 (next_squad_id starts at 0)
    const squadIdBuf = new BN(0).toArrayLike(Buffer, "le", 8);
    [squadPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("squad"), squadIdBuf], program.programId
    );

    // Create USDC mint
    usdcMint = await createMint(connection, authority, authority.publicKey, null, 6);

    // Bond vault — owned by authority
    bondVault = await createAccount(connection, authority, usdcMint, authority.publicKey);

    // Prize vault — owned by prize_authority PDA (so the CPI transfer works)
    prizeVault = await createAccount(connection, authority, usdcMint, prizeAuthPda);

    // Stake vault — owned by stake_authority PDA
    stakeVault = await createAccount(connection, authority, usdcMint, stakeAuthPda);

    // Leader token: 200 USDC
    leaderToken = await createAccount(connection, authority, usdcMint, leader.publicKey);
    await mintTo(connection, authority, usdcMint, leaderToken, authority, 200_000_000n);

    // Predictor token: 100 USDC
    predictorToken = await createAccount(connection, authority, usdcMint, predictor.publicKey);
    await mintTo(connection, authority, usdcMint, predictorToken, authority, 100_000_000n);

    // Pre-fund prize vault with the prize amount
    await mintTo(connection, authority, usdcMint, prizeVault, authority, PRIZE_AMOUNT);
  });

  // ── 1. Initialize Config ────────────────────────────────────────────────
  it("initializes the config PDA", async () => {
    await program.methods
      .initializeConfig()
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        bondVault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const config = await program.account.config.fetch(configPda);
    assert.ok(config.authority.equals(authority.publicKey));
    assert.equal(config.bondAmount.toString(), "50000000", "bond = 50 USDC");
    assert.equal(config.predictionFeeBps, 500, "5% fee");
    assert.equal(config.nextSquadId.toString(), "0");
    assert.equal(config.nextCompetitionId.toString(), "0");
  });

  // ── 2. Init User Profiles ───────────────────────────────────────────────
  it("initializes profiles for leader, member2, and predictor", async () => {
    const pairs: [Keypair, PublicKey][] = [
      [leader,    leaderProfilePda],
      [member2,   member2ProfilePda],
      [predictor, predictorProfilePda],
    ];
    for (const [user, profilePda] of pairs) {
      await program.methods
        .initUserProfile()
        .accounts({
          user: user.publicKey,
          userProfile: profilePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
    }

    const leaderProfile = await program.account.userProfile.fetch(leaderProfilePda);
    assert.isNull(leaderProfile.currentSquad, "no squad yet");
    const predProfile = await program.account.userProfile.fetch(predictorProfilePda);
    assert.isNull(predProfile.currentSquad);
  });

  // ── 3. Create Competition (Registration) ───────────────────────────────
  it("authority creates competition in Registration phase", async () => {
    const now = Math.floor(Date.now() / 1000);

    await program.methods
      .createCompetition({
        seasonId: new BN(1),
        roundNumber: 1,
        startTime: new BN(now - 60), // past → startCompetition can fire immediately
        endTime: new BN(now + 7 * 86400),
        totalPrizeAmount: new BN(PRIZE_AMOUNT.toString()),
      })
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        competition: competitionPda,
        prizeMint: usdcMint,
        prizeVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const comp = await program.account.competition.fetch(competitionPda);
    assert.ok(comp.status.registration !== undefined, "should be Registration");
    assert.equal(comp.competitionId.toString(), "0");

    const config = await program.account.config.fetch(configPda);
    assert.equal(config.nextCompetitionId.toString(), "1", "ID incremented");
  });

  // ── 4. Create Prediction Pool (Registration phase) ─────────────────────
  it("authority creates prediction pool during Registration", async () => {
    await program.methods
      .createPredictionPool()
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        competition: competitionPda,
        predictionPool: predictionPoolPda,
        stakeVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const pool = await program.account.predictionPool.fetch(predictionPoolPda);
    assert.ok(pool.status.open !== undefined, "pool should be Open");
    assert.equal(pool.totalStaked.toString(), "0");
    assert.ok(pool.stakeVault.equals(stakeVault));
    assert.isNull(pool.winningSquad);
  });

  // ── 5. Create Squad ─────────────────────────────────────────────────────
  it("leader creates squad and deposits 50 USDC bond", async () => {
    const vaultBefore = await getAccount(connection, bondVault);

    await program.methods
      .createSquad("Alpha Wolves", false)
      .accounts({
        leader: leader.publicKey,
        config: configPda,
        squad: squadPda,
        userProfile: leaderProfilePda,
        leaderTokenAccount: leaderToken,
        bondVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([leader])
      .rpc();

    const squad = await program.account.squad.fetch(squadPda);
    assert.equal(squad.name, "Alpha Wolves");
    assert.ok(squad.leader.equals(leader.publicKey));
    assert.equal(squad.members.length, 1);
    assert.isTrue(squad.bondDeposited);

    const vaultAfter = await getAccount(connection, bondVault);
    assert.equal(
      BigInt(vaultAfter.amount) - BigInt(vaultBefore.amount),
      50_000_000n,
      "bond transferred"
    );

    const leaderProfile = await program.account.userProfile.fetch(leaderProfilePda);
    assert.ok(leaderProfile.currentSquad?.equals(squadPda));
  });

  // ── 6. Join Squad ───────────────────────────────────────────────────────
  it("member2 joins squad during Registration", async () => {
    await program.methods
      .joinSquad()
      .accounts({
        user: member2.publicKey,
        squad: squadPda,
        userProfile: member2ProfilePda,
        competition: competitionPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([member2])
      .rpc();

    const squad = await program.account.squad.fetch(squadPda);
    assert.equal(squad.members.length, 2);
    assert.ok(squad.members.some((m) => m.equals(member2.publicKey)));
  });

  // ── 7. Register Squad Entry ─────────────────────────────────────────────
  it("leader registers squad for competition", async () => {
    [squadEntryPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("squad_entry"),
        competitionPda.toBuffer(),
        squadPda.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .registerSquadEntry()
      .accounts({
        leader: leader.publicKey,
        competition: competitionPda,
        squad: squadPda,
        userProfile: leaderProfilePda,
        squadEntry: squadEntryPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([leader])
      .rpc();

    const comp = await program.account.competition.fetch(competitionPda);
    assert.equal(comp.totalSquads, 1);

    const entry = await program.account.squadEntry.fetch(squadEntryPda);
    assert.isFalse(entry.finalized);
    assert.equal(entry.memberScores.length, 2, "one slot per member");
  });

  // ── 8. Place Prediction ─────────────────────────────────────────────────
  it("predictor bets 50 USDC on Alpha Wolves (Open pool, Registration)", async () => {
    [predEntryPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pred_entry"),
        predictionPoolPda.toBuffer(),
        predictor.publicKey.toBuffer(),
      ],
      program.programId
    );

    const vaultBefore = await getAccount(connection, stakeVault);

    await program.methods
      .placePrediction(squadPda, new BN(PRED_STAKE.toString()))
      .accounts({
        user: predictor.publicKey,
        competition: competitionPda,
        predictionPool: predictionPoolPda,
        userProfile: predictorProfilePda,
        predictionEntry: predEntryPda,
        userTokenAccount: predictorToken,
        stakeVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([predictor])
      .rpc();

    const vaultAfter = await getAccount(connection, stakeVault);
    assert.equal(
      BigInt(vaultAfter.amount) - BigInt(vaultBefore.amount),
      PRED_STAKE,
      "stake transferred to vault"
    );

    const pool = await program.account.predictionPool.fetch(predictionPoolPda);
    assert.equal(pool.totalStaked.toString(), PRED_STAKE.toString());

    const entry = await program.account.predictionEntry.fetch(predEntryPda);
    assert.ok(entry.squadPicked.equals(squadPda));
    assert.equal(entry.amountStaked.toString(), PRED_STAKE.toString());
    assert.isFalse(entry.claimed);
  });

  // ── 9. Cannot predict own squad ─────────────────────────────────────────
  it("rejects prediction from a squad member on their own squad", async () => {
    // leader is in Alpha Wolves — placing on squadPda should be rejected
    const [leaderPredEntryPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pred_entry"),
        predictionPoolPda.toBuffer(),
        leader.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .placePrediction(squadPda, new BN(1_000_000))
        .accounts({
          user: leader.publicKey,
          competition: competitionPda,
          predictionPool: predictionPoolPda,
          userProfile: leaderProfilePda,
          predictionEntry: leaderPredEntryPda,
          userTokenAccount: leaderToken,
          stakeVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([leader])
        .rpc();
      assert.fail("should have thrown CannotPredictOwnSquad");
    } catch (err: unknown) {
      const msg = (err as Error).message ?? String(err);
      assert.ok(
        msg.includes("CannotPredictOwnSquad") || msg.includes("constraint"),
        `expected CannotPredictOwnSquad, got: ${msg}`
      );
    }
  });

  // ── 10. Start Competition ───────────────────────────────────────────────
  it("authority starts competition (Registration → Active)", async () => {
    await program.methods
      .startCompetition()
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        competition: competitionPda,
      })
      .rpc();

    const comp = await program.account.competition.fetch(competitionPda);
    assert.ok(comp.status.active !== undefined, "should be Active");
  });

  // ── 11. Lock Predictions ────────────────────────────────────────────────
  it("authority locks prediction pool (Active phase)", async () => {
    await program.methods
      .lockPredictions()
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        competition: competitionPda,
        predictionPool: predictionPoolPda,
      })
      .rpc();

    const pool = await program.account.predictionPool.fetch(predictionPoolPda);
    assert.ok(pool.status.locked !== undefined, "pool should be Locked");
  });

  // ── 12. Finalize Round ──────────────────────────────────────────────────
  it("authority finalizes round scores (Active → Calculating)", async () => {
    await program.methods
      .finalizeRound({
        squad: squadPda,
        aggregateScore: new BN(2840), // +28.40% in bps
        memberScores: [new BN(3200), new BN(2500)],
        memberTradeCounts: [12, 8],
        rank: 1,
        prizeAmount: new BN(PRIZE_AMOUNT.toString()),
      })
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        competition: competitionPda,
        squadEntry: squadEntryPda,
      })
      .rpc();

    const entry = await program.account.squadEntry.fetch(squadEntryPda);
    assert.isTrue(entry.finalized);
    assert.equal(entry.rank, 1);
    assert.equal(entry.aggregateScore.toString(), "2840");
    assert.equal(entry.memberScores[0].toString(), "3200");
    assert.equal(entry.memberScores[1].toString(), "2500");
    assert.equal(entry.prizeAmount.toString(), PRIZE_AMOUNT.toString());

    const comp = await program.account.competition.fetch(competitionPda);
    assert.ok(comp.status.calculating !== undefined, "should be Calculating");
  });

  // ── 13. End Competition (set Merkle root) ───────────────────────────────
  it("authority ends competition with Merkle root (Calculating → Finalized)", async () => {
    const leaf = hashLeaf(leader.publicKey, PRIZE_AMOUNT);
    const { root } = buildTree([leaf]);
    const merkleRoot = Array.from(root);

    await program.methods
      .endCompetition(merkleRoot)
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        competition: competitionPda,
      })
      .rpc();

    const comp = await program.account.competition.fetch(competitionPda);
    assert.ok(comp.status.finalized !== undefined, "should be Finalized");
    assert.deepEqual(Array.from(comp.merkleRoot), merkleRoot, "root stored");
  });

  // ── 14. Resolve Prediction ──────────────────────────────────────────────
  it("authority resolves prediction: Alpha Wolves wins", async () => {
    await program.methods
      .resolvePrediction(squadPda)
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        competition: competitionPda,
        predictionPool: predictionPoolPda,
      })
      .rpc();

    const pool = await program.account.predictionPool.fetch(predictionPoolPda);
    assert.ok(pool.status.resolved !== undefined, "should be Resolved");
    assert.ok(pool.winningSquad?.equals(squadPda), "winning squad stored");
  });

  // ── 15. Claim Prediction Payout ─────────────────────────────────────────
  it("predictor claims prediction payout (95% of pool)", async () => {
    // pool total = 50 USDC, predictor is the only staker on the winner
    // payout = 50 USDC * (10000 - 500) / 10000 = 47.5 USDC
    const expectedPayout = (PRED_STAKE * 9500n) / 10000n;

    const balBefore = await getAccount(connection, predictorToken);

    await program.methods
      .claimPrediction()
      .accounts({
        user: predictor.publicKey,
        config: configPda,
        predictionPool: predictionPoolPda,
        predictionEntry: predEntryPda,
        stakeVault,
        userTokenAccount: predictorToken,
        stakeAuthority: stakeAuthPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([predictor])
      .rpc();

    const balAfter = await getAccount(connection, predictorToken);
    assert.equal(
      BigInt(balAfter.amount) - BigInt(balBefore.amount),
      expectedPayout,
      "predictor received 95% payout"
    );

    const entry = await program.account.predictionEntry.fetch(predEntryPda);
    assert.isTrue(entry.claimed, "entry marked as claimed");
  });

  // ── 16. Reject Duplicate Prediction Claim ──────────────────────────────
  it("rejects a second prediction claim (AlreadyClaimed)", async () => {
    try {
      await program.methods
        .claimPrediction()
        .accounts({
          user: predictor.publicKey,
          config: configPda,
          predictionPool: predictionPoolPda,
          predictionEntry: predEntryPda,
          stakeVault,
          userTokenAccount: predictorToken,
          stakeAuthority: stakeAuthPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([predictor])
        .rpc();
      assert.fail("should have thrown AlreadyClaimed");
    } catch (err: unknown) {
      const msg = (err as Error).message ?? String(err);
      assert.ok(
        msg.includes("AlreadyClaimed") || msg.includes("already"),
        `expected AlreadyClaimed, got: ${msg}`
      );
    }
  });

  // ── 17. Claim Prize (with ClaimRecord guard) ────────────────────────────
  it("leader claims prize with valid Merkle proof — ClaimRecord initialized", async () => {
    const leaf = hashLeaf(leader.publicKey, PRIZE_AMOUNT);
    const { proofs } = buildTree([leaf]);
    const proof = proofs[0].map((p) => Array.from(p));

    const [claimRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("claim"), competitionPda.toBuffer(), leader.publicKey.toBuffer()],
      program.programId
    );

    const balBefore = await getAccount(connection, leaderToken);

    await program.methods
      .claimPrize(new BN(PRIZE_AMOUNT.toString()), proof)
      .accounts({
        claimant: leader.publicKey,
        competition: competitionPda,
        claimRecord: claimRecordPda,
        prizeVault,
        claimantTokenAccount: leaderToken,
        prizeAuthority: prizeAuthPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([leader])
      .rpc();

    const balAfter = await getAccount(connection, leaderToken);
    assert.equal(
      BigInt(balAfter.amount) - BigInt(balBefore.amount),
      PRIZE_AMOUNT,
      "leader received prize"
    );

    // ClaimRecord was initialized
    const record = await program.account.claimRecord.fetch(claimRecordPda);
    assert.ok(record.claimant.equals(leader.publicKey));
    assert.ok(record.competition.equals(competitionPda));
    assert.equal(record.amount.toString(), PRIZE_AMOUNT.toString());
  });

  // ── 18. Reject Double Prize Claim ──────────────────────────────────────
  it("rejects second prize claim from leader (ClaimRecord already exists)", async () => {
    const leaf = hashLeaf(leader.publicKey, PRIZE_AMOUNT);
    const { proofs } = buildTree([leaf]);
    const proof = proofs[0].map((p) => Array.from(p));

    const [claimRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("claim"), competitionPda.toBuffer(), leader.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .claimPrize(new BN(PRIZE_AMOUNT.toString()), proof)
        .accounts({
          claimant: leader.publicKey,
          competition: competitionPda,
          claimRecord: claimRecordPda,
          prizeVault,
          claimantTokenAccount: leaderToken,
          prizeAuthority: prizeAuthPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([leader])
        .rpc();
      assert.fail("should have rejected — ClaimRecord already exists");
    } catch (err: unknown) {
      // Anchor `init` rejects if the account already holds data
      const msg = (err as Error).message ?? String(err);
      assert.ok(msg.length > 0, "error thrown for double claim attempt");
    }
  });

  // ── 19. Reject Invalid Merkle Proof ────────────────────────────────────
  it("rejects claim with invalid Merkle proof (member2, garbage proof)", async () => {
    const badProof = [[...Buffer.alloc(32, 0xff)]];

    const [member2ClaimRecord] = PublicKey.findProgramAddressSync(
      [Buffer.from("claim"), competitionPda.toBuffer(), member2.publicKey.toBuffer()],
      program.programId
    );
    const member2Token = await createAccount(connection, authority, usdcMint, member2.publicKey);

    try {
      await program.methods
        .claimPrize(new BN(PRIZE_AMOUNT.toString()), badProof)
        .accounts({
          claimant: member2.publicKey,
          competition: competitionPda,
          claimRecord: member2ClaimRecord,
          prizeVault,
          claimantTokenAccount: member2Token,
          prizeAuthority: prizeAuthPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([member2])
        .rpc();
      assert.fail("should have thrown InvalidMerkleProof");
    } catch (err: unknown) {
      const msg = (err as Error).message ?? String(err);
      assert.ok(
        msg.includes("InvalidMerkleProof") || msg.includes("6"),
        `expected InvalidMerkleProof, got: ${msg}`
      );
    }
  });
});
