/**
 * One-time program initialization script.
 *
 * Creates the global Config PDA and a USDC bond vault for the program.
 *
 * Usage:
 *   ANCHOR_WALLET=~/.config/solana/id.json \
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *   npx ts-node scripts/initialize.ts [--bond-vault <existing-vault-pubkey>]
 *
 * If --bond-vault is not provided, a new USDC token account is created.
 * Set USDC_MINT env var to override (defaults to devnet USDC).
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAccount,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { AdrenaSquads } from "../target/types/adrena_squads";
import idl from "../target/idl/adrena_squads.json";

// Devnet USDC (Circle) — change if using a local test mint
const DEVNET_USDC = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(idl as AdrenaSquads, provider);
  const authority = (provider.wallet as anchor.Wallet).payer;

  console.log("Authority:", authority.publicKey.toBase58());
  console.log("Program ID:", program.programId.toBase58());

  // Parse args
  const args = process.argv.slice(2);
  const vaultArgIdx = args.indexOf("--bond-vault");
  let bondVault: PublicKey;

  const usdcMint = new PublicKey(
    process.env.USDC_MINT ?? DEVNET_USDC.toBase58()
  );

  if (vaultArgIdx !== -1 && args[vaultArgIdx + 1]) {
    bondVault = new PublicKey(args[vaultArgIdx + 1]);
    console.log("Using existing bond vault:", bondVault.toBase58());
  } else {
    console.log("Creating new bond vault...");
    const vaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority,
      usdcMint,
      authority.publicKey
    );
    bondVault = vaultAccount.address;
    console.log("Bond vault created:", bondVault.toBase58());
  }

  // Derive config PDA
  const [configPda, configBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  console.log("Config PDA:", configPda.toBase58(), "bump:", configBump);

  // Check if already initialized
  try {
    const existing = await program.account.config.fetch(configPda);
    console.log("\n⚠️  Config already initialized!");
    console.log("  Authority:", existing.authority.toBase58());
    console.log("  Next squad ID:", existing.nextSquadId.toString());
    console.log("  Next competition ID:", existing.nextCompetitionId.toString());
    console.log("  Bond amount:", existing.bondAmount.toString(), "USDC units");
    process.exit(0);
  } catch {
    // Not initialized yet — proceed
  }

  console.log("\nInitializing config PDA...");
  const tx = await program.methods
    .initializeConfig()
    .accounts({
      authority: authority.publicKey,
      config: configPda,
      bondVault,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("✅ Config initialized!");
  console.log("  Tx:", tx);
  console.log("  Config PDA:", configPda.toBase58());
  console.log("  Bond vault:", bondVault.toBase58());
  console.log("  Bond amount: 50 USDC (50_000_000 units)");
  console.log("  Prediction fee: 5% (500 bps)");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
