/**
 * Simulate a competition round: fetch Adrena trades, compute scores, finalize
 * on-chain, build a Merkle tree, and call end_competition.
 *
 * Usage:
 *   ANCHOR_WALLET=~/.config/solana/id.json \
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *   npx ts-node scripts/simulate-round.ts \
 *     --competition <competition-pda> \
 *     [--dry-run]
 *
 * With --dry-run, scores are printed but no transactions are submitted.
 */

import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { AdrenaSquads } from "../target/types/adrena_squads";
import idl from "../target/idl/adrena_squads.json";
import {
  calculateMemberScore,
  calculateSquadScore,
  rankSquads,
} from "../src/scoring/calculator";
import { buildMerkleTree, rootToBytes, proofToBytes } from "../src/leaderboard/merkle";
import { getClosedTrades } from "../src/scoring/trade-parser";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(idl as AdrenaSquads, provider);
  const authority = (provider.wallet as anchor.Wallet).payer;

  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const dryRun = args.includes("--dry-run");

  const compArg = get("--competition");
  if (!compArg) {
    console.error("Error: --competition <pda> is required");
    process.exit(1);
  }
  const competitionPda = new PublicKey(compArg);

  // Fetch competition state
  const comp = await program.account.competition.fetch(competitionPda);
  console.log("Competition:", competitionPda.toBase58());
  console.log("  Season:", comp.seasonId.toString(), "Round:", comp.roundNumber);
  console.log("  Status:", JSON.stringify(comp.status));
  console.log("  Total squads:", comp.totalSquads);

  if (!comp.status.active) {
    console.error("Competition is not Active. Current status:", JSON.stringify(comp.status));
    process.exit(1);
  }

  // ── Derive config PDA ────────────────────────────────────────────────────
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  // ── Fetch all registered squad entries ───────────────────────────────────
  console.log("\nFetching all squad entries...");
  const allEntries = await program.account.squadEntry.all([
    {
      memcmp: {
        offset: 8, // after discriminator
        bytes: competitionPda.toBase58(),
      },
    },
  ]);
  console.log("Found", allEntries.length, "squad entries");

  // ── Compute scores for each squad ────────────────────────────────────────
  const squadScores = [];
  const prizeLeaves: Array<{ wallet: string; amount: number }> = [];

  for (const entryAccount of allEntries) {
    const entry = entryAccount.account;
    const squadPda = entry.squad;

    // Fetch squad data
    const squad = await program.account.squad.fetch(squadPda);
    console.log(`\nSquad "${squad.name}" (${squadPda.toBase58().slice(0, 8)}...)`);
    console.log("  Members:", squad.members.length);

    // Fetch trades for each member in the competition window
    const memberScores = [];
    for (const memberPubkey of squad.members) {
      const wallet = memberPubkey.toBase58();
      let trades = [];
      try {
        trades = await getClosedTrades(
          provider.connection,
          wallet,
          comp.startTime.toNumber(),
          comp.endTime.toNumber()
        );
      } catch (e) {
        console.warn(`    ⚠️  Could not fetch trades for ${wallet.slice(0, 8)}: ${e}`);
      }
      const ms = calculateMemberScore(wallet, trades);
      memberScores.push(ms);
      console.log(
        `    ${wallet.slice(0, 8)}... trades=${ms.tradeCount} pnl=$${ms.realizedPnl.toFixed(2)} score=${ms.score}bps`
      );
    }

    const squadScore = calculateSquadScore(
      squad.squadId.toNumber(),
      squadPda.toBase58(),
      memberScores
    );
    squadScores.push({ squadScore, squadPda, entry: entryAccount });
    console.log(`  Aggregate score: ${squadScore.aggregateScore} bps`);
  }

  // ── Rank squads ───────────────────────────────────────────────────────────
  const ranked = rankSquads(squadScores.map((s) => s.squadScore));

  // ── Distribute prize pool ─────────────────────────────────────────────────
  const totalPrize = comp.totalPrizeAmount.toNumber();
  // Simple top-3 distribution: 50% / 30% / 20%
  const prizeShares = [0.5, 0.3, 0.2];
  const prizeByRank: Map<number, number> = new Map();
  for (let i = 0; i < Math.min(ranked.length, 3); i++) {
    prizeByRank.set(
      ranked[i].squadId,
      Math.floor(totalPrize * (prizeShares[i] ?? 0))
    );
  }

  console.log("\n── Leaderboard ─────────────────────────────────────────────");
  for (const sq of ranked) {
    const prize = prizeByRank.get(sq.squadId) ?? 0;
    console.log(
      `  #${sq.rank} Squad ${sq.squadId}  score=${sq.aggregateScore}bps  prize=${prize} USDC units`
    );
  }

  if (dryRun) {
    console.log("\n[dry-run] No transactions submitted.");
    return;
  }

  // ── Finalize each squad entry on-chain ────────────────────────────────────
  console.log("\nSubmitting finalize_round transactions...");
  for (const { squadScore, squadPda, entry: entryAccount } of squadScores) {
    const ranked_sq = ranked.find((r) => r.squadId === squadScore.squadId)!;
    const prize = prizeByRank.get(ranked_sq.squadId) ?? 0;

    const [squadEntryPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("squad_entry"),
        competitionPda.toBuffer(),
        squadPda.toBuffer(),
      ],
      program.programId
    );

    const tx = await program.methods
      .finalizeRound({
        squad: squadPda,
        aggregateScore: new BN(ranked_sq.aggregateScore),
        memberScores: squadScore.memberScores.map((m) => new BN(m.score)),
        memberTradeCounts: squadScore.memberScores.map((m) => m.tradeCount),
        rank: ranked_sq.rank,
        prizeAmount: new BN(prize),
      })
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        competition: competitionPda,
        squadEntry: squadEntryPda,
      })
      .rpc();

    console.log(
      `  ✅ Squad ${ranked_sq.squadId} finalized  rank=${ranked_sq.rank}  tx=${tx.slice(0, 12)}...`
    );

    // Collect prize leaf for Merkle tree
    const squad = await program.account.squad.fetch(squadPda);
    if (prize > 0) {
      // Prize goes to squad leader
      prizeLeaves.push({ wallet: squad.leader.toBase58(), amount: prize });
    }
  }

  // ── Build Merkle tree and end competition ─────────────────────────────────
  console.log("\nBuilding Merkle tree for", prizeLeaves.length, "prize leaf(ves)...");

  let merkleRoot: number[];
  if (prizeLeaves.length === 0) {
    merkleRoot = Array(32).fill(0);
  } else {
    const result = buildMerkleTree(prizeLeaves);
    merkleRoot = rootToBytes(result.rootHex);
    console.log("  Merkle root:", result.rootHex);

    // Print proof for each winner (they need this to claim)
    console.log("\n── Winner Proofs (share with claimants) ──────────────────");
    for (const leaf of prizeLeaves) {
      const hexProof = result.proofs.get(leaf.wallet) ?? [];
      console.log(`  ${leaf.wallet.slice(0, 8)}...  amount=${leaf.amount}`);
      console.log(`  proof=${JSON.stringify(hexProof)}`);
    }
  }

  const tx = await program.methods
    .endCompetition(merkleRoot)
    .accounts({
      authority: authority.publicKey,
      config: configPda,
      competition: competitionPda,
    })
    .rpc();

  console.log("\n✅ Competition ended!");
  console.log("  Tx:", tx);
  console.log("  Merkle root:", Buffer.from(merkleRoot).toString("hex"));
  console.log("\nWinners can now call claim_prize with their Merkle proof.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
