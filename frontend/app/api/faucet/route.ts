import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

const MINT       = new PublicKey("WxKsUrqXn2BfD69Vnpu8xpBo83VwLbhZbPLbDqh4Szo");
const AMOUNT     = 100 * 1_000_000; // 100 USDC (6 decimals)
const DEVNET_RPC = "https://api.devnet.solana.com";

export async function POST(req: Request) {
  try {
    const { wallet } = await req.json();
    if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

    const raw = process.env.MINT_AUTHORITY_KEYPAIR;
    if (!raw) return NextResponse.json({ error: "faucet not configured" }, { status: 500 });

    const authority  = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
    const connection = new Connection(DEVNET_RPC, "confirmed");
    const recipient  = new PublicKey(wallet);

    const ata = await getOrCreateAssociatedTokenAccount(
      connection, authority, MINT, recipient
    );

    const sig = await mintTo(
      connection, authority, MINT, ata.address, authority, AMOUNT
    );

    return NextResponse.json({
      success: true,
      signature: sig,
      amount: 100,
      ata: ata.address.toBase58(),
      explorerUrl: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
    });
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Faucet error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
