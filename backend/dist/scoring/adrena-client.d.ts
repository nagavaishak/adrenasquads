/**
 * Wrapper around Adrena's public data API.
 * Base URL: https://datapi.adrena.trade
 *
 * All monetary values from the API are returned as strings with 6-decimal
 * fixed-point scaling (e.g. "477615729134" = $477,615.729134).
 * Helper `fromFixed6()` converts them to plain USD numbers.
 */
/** Convert a 6-decimal fixed-point string to a USD float */
export declare function fromFixed6(raw: string | number): number;
/** One open position returned by /get-positions */
export interface AdrenaPositionRaw {
    pubkey: string;
    owner: string;
    side: 'long' | 'short';
    token: string;
    /** Position size in USD (fixed-point string, 6 decimals) */
    sizeUsd: string;
    /** Collateral in USD (fixed-point string, 6 decimals) */
    collateralUsd: string;
    /** Entry price in USD (fixed-point string, 6 decimals) */
    entryPrice: string;
    /** Unrealized PnL in USD (fixed-point string, 6 decimals, can be negative) */
    unrealizedPnl: string;
    /** Unix timestamp (seconds) when position was opened */
    openTime: number;
    /** Leverage multiplier */
    leverage?: string;
    /** Liquidation price (fixed-point string) */
    liquidationPrice?: string;
    /** Symbol of the underlying token (e.g. "SOL", "BTC") */
    tokenSymbol?: string;
}
/** Normalized open position with plain USD floats */
export interface AdrenaPosition {
    pubkey: string;
    owner: string;
    side: 'long' | 'short';
    token: string;
    sizeUsd: number;
    collateralUsd: number;
    entryPrice: number;
    unrealizedPnl: number;
    openTime: number;
    leverage: number;
    liquidationPrice: number;
}
/** One custody entry from /liquidity-info */
export interface AdrenaCustody {
    pubkey: string;
    symbol: string;
    name: string;
    mint: string;
    aumUsd: number;
    aumTokenAmount: number;
    currentWeightagePct: number;
    targetWeightagePct: number;
    utilizationPct: number;
    owned: number;
    locked: number;
}
export interface AdrenaLiquidityInfo {
    aumUsd: number;
    alpPriceUsd: number;
    alpTotalSupply: number;
    custodies: AdrenaCustody[];
}
export interface AdrenaPoolStats {
    totalLiquidityUsdc: number;
    openInterestLong: number;
    openInterestShort: number;
    volumeUsdc24h: number;
    feesUsdc24h: number;
}
/**
 * Fetch open positions for a wallet.
 * Returns [] if the wallet has no open positions (API may return 400 in that case).
 */
export declare function getPositions(wallet: string): Promise<AdrenaPosition[]>;
/**
 * Fetch real-time liquidity info for all custodies.
 * Confirmed working — see /liquidity-info.
 */
export declare function getLiquidityInfo(): Promise<AdrenaLiquidityInfo>;
/** Fetch 24h pool statistics */
export declare function getPoolStats(): Promise<AdrenaPoolStats>;
//# sourceMappingURL=adrena-client.d.ts.map