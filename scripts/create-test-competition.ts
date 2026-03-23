/**
 * Creates a test competition on devnet in Registration phase.
 *
 * Usage:
 *   ANCHOR_WALLET=~/.config/solana/id.json \
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *   npx ts-node scripts/create-test-competition.ts \
 *     --prize-vault <vault-pubkey> \
 *     [--prize-amount 5000000] \
 *     [--duration-days 7]
 *
 * Prize amount defaults to 5 USDC (5_000_000 units).
 * Duration defaults to 7 days.
 * start_time is set to NOW so startCompetition can fire immediately.
 */

import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { AdrenaSquads } from "../target/types/adrena_squads";
import idl from "../target/idl/adrena_squads.json";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(idl as AdrenaSquads, provider);
  const authority = (provider.wallet as anchor.Wallet).payer;

  console.log("Authority:", authority.publicKey.toBase58());

  // Parse CLI args
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const prizeVaultArg = get("--prize-vault");
  if (!prizeVaultArg) {
    console.error("Error: --prize-vault <pubkey> is required");
    process.exit(1);
  }
  const prizeVault = new PublicKey(prizeVaultArg);
  const prizeAmount = BigInt(get("--prize-amount") ?? "5000000");
  const durationDays = parseInt(get("--duration-days") ?? "7", 10);

  // Fetch config
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  const config = await program.account.config.fetch(configPda);
  const compId = config.nextCompetitionId;

  console.log("Current competition ID:", compId.toString());

  // Derive competition PDA
  const [competitionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("competition"), compId.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  // Derive prize_auth PDA (for reference — vault must be owned by this)
  const [prizeAuthPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("prize_auth"), competitionPda.toBuffer()],
    program.programId
  );

  const now = Math.floor(Date.now() / 1000);
  const startTime = now; // starts now
  const endTime = now + durationDays * 86400;

  // Determine season + round from ID
  const seasonId = 1n;
  const roundNumber = Number(compId) + 1;

  // Fetch prize vault info to get the mint
  const vaultInfo = await provider.connection.getAccountInfo(prizeVault);
  if (!vaultInfo) {
    console.error("Prize vault not found:", prizeVault.toBase58());
    process.exit(1);
  }
  // SPL token account data layout: mint is at offset 0, 32 bytes
  const prizeMint = new PublicKey(vaultInfo.data.slice(0, 32));

  console.log("\nCreating competition:");
  console.log("  PDA:", competitionPda.toBase58());
  console.log("  Prize auth PDA:", prizeAuthPda.toBase58());
  console.log("  Season:", seasonId.toString(), "Round:", roundNumber);
  console.log("  Prize amount:", prizeAmount.toString(), "USDC units");
  console.log("  Duration:", durationDays, "days");
  console.log(
    "  Start:",
    new Date(startTime * 1000).toISOString(),
    "→",
    new Date(endTime * 1000).toISOString()
  );
  console.log("\n⚠️  Ensure prize vault is owned by:", prizeAuthPda.toBase58());

  const tx = await program.methods
    .createCompetition({
      seasonId: new BN(seasonId.toString()),
      roundNumber,
      startTime: new BN(startTime),
      endTime: new BN(endTime),
      totalPrizeAmount: new BN(prizeAmount.toString()),
    })
    .accounts({
      authority: authority.publicKey,
      config: configPda,
      competition: competitionPda,
      prizeMint,
      prizeVault,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("\n✅ Competition created!");
  console.log("  Tx:", tx);
  console.log("  Competition PDA:", competitionPda.toBase58());
  console.log("  Status: Registration (squads can now register)");
  console.log("\nNext steps:");
  console.log("  1. Have squad leaders call register_squad_entry");
  console.log("  2. Call start_competition once ready");
  console.log("  3. After round ends, run simulate-round.ts to submit scores");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
