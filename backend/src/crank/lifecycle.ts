/**
 * Competition lifecycle crank.
 * Polls every 10 seconds and handles state transitions:
 *   Registration → Active (when Clock >= start_time)
 *   Active → Calculating → Finalized (when Clock >= end_time)
 *   Prediction pool: Open → Locked → Resolved
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getActiveCompetition, pool } from '../db/queries.js';
import { getClosedTrades } from '../scoring/trade-parser.js';
import { calculateMemberScore, calculateSquadScore, rankSquads } from '../scoring/calculator.js';
import { buildMerkleTree, rootToBytes, proofToBytes } from '../leaderboard/merkle.js';

dotenv.config();

const POLL_INTERVAL_MS = 10_000;

async function getProgram() {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  const keypairPath = process.env.ANCHOR_WALLET ?? path.join(process.env.HOME!, '.config/solana/id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  const idl = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../../../target/idl/adrena_squads.json'),
      'utf-8',
    ),
  );

  const programId = new PublicKey(process.env.PROGRAM_ID ?? idl.address);
  return new anchor.Program(idl, provider);
}

async function crankLoop() {
  console.log('[Crank] Starting competition lifecycle crank...');

  const program = await getProgram();
  const connection = (program.provider as anchor.AnchorProvider).connection;

  while (true) {
    try {
      await tick(program, connection);
    } catch (err) {
      console.error('[Crank] Error:', err);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

async function tick(program: anchor.Program, connection: Connection) {
  const competition = await getActiveCompetition();
  if (!competition) {
    console.log('[Crank] No active competition found.');
    return;
  }

  const now = Date.now() / 1000;
  const startTime = competition.start_time.getTime() / 1000;
  const endTime = competition.end_time.getTime() / 1000;

  // Registration → Active
  if (competition.status === 'Registration' && now >= startTime) {
    console.log(`[Crank] Starting competition ${competition.competition_id}`);
    await startCompetition(program, competition.competition_pubkey);
    await pool.query(
      "UPDATE competitions SET status = 'Active', updated_at = NOW() WHERE competition_pubkey = $1",
      [competition.competition_pubkey],
    );
  }

  // Active → Finalize
  if (competition.status === 'Active' && now >= endTime) {
    console.log(`[Crank] Finalizing competition ${competition.competition_id}`);
    await finalizeCompetition(program, connection, competition);
  }
}

async function startCompetition(program: anchor.Program, competitionPubkey: string) {
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId,
  );

  await (program.methods as any)
    .startCompetition()
    .accounts({
      authority: (program.provider as anchor.AnchorProvider).wallet.publicKey,
      config: configPda,
      competition: new PublicKey(competitionPubkey),
    })
    .rpc();
}

async function finalizeCompetition(
  program: anchor.Program,
  connection: Connection,
  competition: any,
) {
  // 1. Fetch all registered squads for this competition
  const { rows: entries } = await pool.query(
    `SELECT se.entry_pubkey, se.squad_pubkey, s.leader_pubkey,
            array_agg(sm.wallet) AS members
     FROM squad_entries se
     JOIN squads s ON se.squad_pubkey = s.squad_pubkey
     JOIN squad_members sm ON s.squad_pubkey = sm.squad_pubkey
     WHERE se.competition_pubkey = $1
     GROUP BY se.entry_pubkey, se.squad_pubkey, s.leader_pubkey`,
    [competition.competition_pubkey],
  );

  const startTime = competition.start_time.getTime() / 1000;
  const endTime = competition.end_time.getTime() / 1000;

  // 2. Calculate scores for each squad
  const squadScores = await Promise.all(
    entries.map(async (entry: any, idx: number) => {
      const memberScores = await Promise.all(
        entry.members.map(async (wallet: string) => {
          const trades = await getClosedTrades(connection, wallet, startTime, endTime);
          return calculateMemberScore(wallet, trades);
        }),
      );
      return calculateSquadScore(idx, entry.squad_pubkey, memberScores);
    }),
  );

  // 3. Rank squads
  const ranked = rankSquads(squadScores);

  // 4. Build prize distribution
  const totalPrize = Number(competition.total_prize_amount);
  const prizeAllocs: { wallet: string; amount: number }[] = [];

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId,
  );

  // 5. Submit scores on-chain per squad and build prize leaves
  for (const squad of ranked) {
    const prize = ranked.indexOf(squad) === 0
      ? Math.floor(totalPrize * 0.30)
      : ranked.indexOf(squad) === 1
      ? Math.floor(totalPrize * 0.15)
      : ranked.indexOf(squad) === 2
      ? Math.floor(totalPrize * 0.05)
      : 0;

    const entry = entries.find((e: any) => e.squad_pubkey === squad.squadPubkey);
    if (!entry) continue;

    await (program.methods as any)
      .finalizeRound({
        squad: new PublicKey(squad.squadPubkey),
        aggregateScore: squad.aggregateScore,
        memberScores: squad.memberScores.map((m) => m.score),
        memberTradeCounts: squad.memberScores.map((m) => m.tradeCount),
        rank: squad.rank,
        prizeAmount: prize,
      })
      .accounts({
        authority: (program.provider as anchor.AnchorProvider).wallet.publicKey,
        config: configPda,
        competition: new PublicKey(competition.competition_pubkey),
        squadEntry: new PublicKey(entry.entry_pubkey),
      })
      .rpc();

    if (prize > 0) {
      // Leader collects 10% of squad prize
      const leaderBonus = Math.floor(prize * 0.1);
      const squadShare = prize - leaderBonus;
      prizeAllocs.push({ wallet: entry.leader_pubkey, amount: leaderBonus + squadShare });
    }

    // Update DB
    await pool.query(
      `UPDATE squad_entries
       SET aggregate_score = $1, rank = $2, prize_amount = $3, finalized = true, updated_at = NOW()
       WHERE entry_pubkey = $4`,
      [squad.aggregateScore, squad.rank, prize, entry.entry_pubkey],
    );
  }

  // 6. Build Merkle tree and finalize on-chain
  const { root, rootHex, proofs } = buildMerkleTree(prizeAllocs);
  const merkleRootBytes = rootToBytes(rootHex);

  await (program.methods as any)
    .endCompetition(merkleRootBytes)
    .accounts({
      authority: (program.provider as anchor.AnchorProvider).wallet.publicKey,
      config: configPda,
      competition: new PublicKey(competition.competition_pubkey),
    })
    .rpc();

  // Store proofs in DB for frontend
  for (const [wallet, proof] of proofs) {
    const proofBytes = proofToBytes(proof);
    await pool.query(
      `UPDATE member_scores SET updated_at = NOW() WHERE wallet = $1`,
      [wallet],
    );
    console.log(`[Crank] Proof for ${wallet}:`, proofBytes.length, 'nodes');
  }

  await pool.query(
    "UPDATE competitions SET status = 'Finalized', merkle_root = $1, updated_at = NOW() WHERE competition_pubkey = $2",
    [rootHex, competition.competition_pubkey],
  );

  console.log(`[Crank] Competition ${competition.competition_id} finalized. Merkle root: ${rootHex}`);
}

crankLoop().catch(console.error);
