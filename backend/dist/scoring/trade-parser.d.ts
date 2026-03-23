/**
 * Parse closed trades from Solana RPC transaction history.
 *
 * Strategy: getSignaturesForAddress with the Adrena program ID, then
 * filter transactions containing close_position or liquidate instructions,
 * and extract realized PnL from position account state changes.
 */
import { Connection } from '@solana/web3.js';
import { ClosedTrade } from './calculator.js';
export declare const ADRENA_PROGRAM_ID = "13gDzEXCdocbj8iAiqrScGo47NiSuYENGsRqi3SEAwet";
/**
 * Fetch closed trades for a wallet within a competition time window.
 * @param connection  Solana RPC connection
 * @param wallet      Trader's wallet address
 * @param startTime   Competition start (unix seconds)
 * @param endTime     Competition end (unix seconds)
 */
export declare function getClosedTrades(connection: Connection, wallet: string, startTime: number, endTime: number): Promise<ClosedTrade[]>;
//# sourceMappingURL=trade-parser.d.ts.map