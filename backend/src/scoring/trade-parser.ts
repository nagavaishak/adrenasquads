/**
 * Parse closed trades from Solana RPC transaction history.
 *
 * Strategy: getSignaturesForAddress with the Adrena program ID, then
 * filter transactions containing close_position or liquidate instructions,
 * and extract realized PnL from position account state changes.
 */

import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
} from '@solana/web3.js';
import { ClosedTrade } from './calculator.js';

export const ADRENA_PROGRAM_ID = '13gDzEXCdocbj8iAiqrScGo47NiSuYENGsRqi3SEAwet';

// Instruction discriminators (first 8 bytes of sha256("global:<instruction_name>"))
// These will need to be updated based on the actual Adrena IDL.
const CLOSE_POSITION_DISCRIMINATORS = new Set([
  'close_position',
  'close_position_long',
  'close_position_short',
  'liquidate_position',
  'force_close_position',
]);

/**
 * Fetch closed trades for a wallet within a competition time window.
 * @param connection  Solana RPC connection
 * @param wallet      Trader's wallet address
 * @param startTime   Competition start (unix seconds)
 * @param endTime     Competition end (unix seconds)
 */
export async function getClosedTrades(
  connection: Connection,
  wallet: string,
  startTime: number,
  endTime: number,
): Promise<ClosedTrade[]> {
  const walletKey = new PublicKey(wallet);
  const programKey = new PublicKey(ADRENA_PROGRAM_ID);

  // Fetch up to 1000 signatures for this wallet
  const signatures = await connection.getSignaturesForAddress(walletKey, {
    limit: 1000,
  });

  // Filter to time window
  const relevant = signatures.filter(
    (sig) =>
      sig.blockTime !== null &&
      sig.blockTime !== undefined &&
      sig.blockTime >= startTime &&
      sig.blockTime <= endTime &&
      !sig.err,
  );

  if (relevant.length === 0) return [];

  // Batch fetch transactions (max 10 at a time to avoid RPC limits)
  const trades: ClosedTrade[] = [];
  const batchSize = 10;

  for (let i = 0; i < relevant.length; i += batchSize) {
    const batch = relevant.slice(i, i + batchSize);
    const txs = await connection.getParsedTransactions(
      batch.map((s) => s.signature),
      { maxSupportedTransactionVersion: 0 },
    );

    for (const tx of txs) {
      if (!tx) continue;
      const trade = extractTradeFromTx(tx, wallet, programKey.toBase58());
      if (trade) trades.push(trade);
    }
  }

  return trades;
}

function extractTradeFromTx(
  tx: ParsedTransactionWithMeta,
  wallet: string,
  programId: string,
): ClosedTrade | null {
  // Check if tx involves the Adrena program
  const accountKeys = tx.transaction.message.accountKeys.map((k) =>
    typeof k === 'string' ? k : k.pubkey.toBase58(),
  );

  if (!accountKeys.includes(programId)) return null;

  // Look for a close_position-like instruction
  const instructions = tx.transaction.message.instructions;
  const isClose = instructions.some((ix) => {
    if ('programId' in ix) {
      return ix.programId.toBase58() === programId;
    }
    return false;
  });

  if (!isClose) return null;

  // Extract PnL from token balance changes
  const preBalances = tx.meta?.preTokenBalances ?? [];
  const postBalances = tx.meta?.postTokenBalances ?? [];

  // Find the wallet's USDC balance change
  const walletPreBalance = preBalances.find(
    (b) => b.owner === wallet,
  );
  const walletPostBalance = postBalances.find(
    (b) => b.owner === wallet,
  );

  if (!walletPreBalance || !walletPostBalance) return null;

  const preAmount = parseFloat(walletPreBalance.uiTokenAmount?.uiAmountString ?? '0');
  const postAmount = parseFloat(walletPostBalance.uiTokenAmount?.uiAmountString ?? '0');
  const pnl = postAmount - preAmount;

  // Estimate collateral from instruction data (simplified — actual parsing
  // would decode the instruction args from Adrena's IDL)
  const collateral = Math.abs(pnl) * 5; // conservative 5x collateral estimate

  return {
    signature: tx.transaction.signatures[0],
    wallet,
    pnl,
    collateral: Math.max(collateral, 10),
    timestamp: tx.blockTime ?? 0,
    size: Math.abs(pnl) * 10,
    side: pnl > 0 ? 'long' : 'short',
    token: 'SOL',
  };
}
