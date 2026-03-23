/**
 * Wrapper around Adrena's public data API.
 * Base URL: https://datapi.adrena.trade
 *
 * All monetary values from the API are returned as strings with 6-decimal
 * fixed-point scaling (e.g. "477615729134" = $477,615.729134).
 * Helper `fromFixed6()` converts them to plain USD numbers.
 */

const ADRENA_API_BASE = process.env.ADRENA_API_BASE ?? 'https://datapi.adrena.trade';

/** Convert a 6-decimal fixed-point string to a USD float */
export function fromFixed6(raw: string | number): number {
  return Number(raw) / 1_000_000;
}

// ── Response shapes (from live API inspection) ────────────────────────────────

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

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const url = `${ADRENA_API_BASE}${path}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new Error(`Adrena API ${res.status} at ${url}`);
  }
  const body = await res.json() as { success: boolean; error: unknown; data: T };
  if (!body.success) {
    throw new Error(`Adrena API returned success=false at ${url}: ${JSON.stringify(body.error)}`);
  }
  return body.data;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch open positions for a wallet.
 * Returns [] if the wallet has no open positions (API may return 400 in that case).
 */
export async function getPositions(wallet: string): Promise<AdrenaPosition[]> {
  let raw: AdrenaPositionRaw[];
  try {
    raw = await apiFetch<AdrenaPositionRaw[]>(`/get-positions?account=${wallet}`);
  } catch (err) {
    // 400 = no open positions for this wallet — treat as empty, not an error
    const msg = String(err);
    if (msg.includes('400')) return [];
    throw err;
  }
  if (!Array.isArray(raw)) return [];

  return raw.map((p) => ({
    pubkey: p.pubkey,
    owner: p.owner,
    side: p.side,
    token: p.token ?? p.tokenSymbol ?? 'UNKNOWN',
    sizeUsd: fromFixed6(p.sizeUsd),
    collateralUsd: fromFixed6(p.collateralUsd),
    entryPrice: fromFixed6(p.entryPrice),
    unrealizedPnl: fromFixed6(p.unrealizedPnl),
    openTime: p.openTime,
    leverage: p.leverage ? Number(p.leverage) / 1_000_000 : 0,
    liquidationPrice: p.liquidationPrice ? fromFixed6(p.liquidationPrice) : 0,
  }));
}

/**
 * Fetch real-time liquidity info for all custodies.
 * Confirmed working — see /liquidity-info.
 */
export async function getLiquidityInfo(): Promise<AdrenaLiquidityInfo> {
  const raw = await apiFetch<Record<string, unknown>>('/liquidity-info');
  const custodies = (raw.custodies as Record<string, unknown>[]) ?? [];
  return {
    aumUsd: fromFixed6(raw.aumUsd as string),
    alpPriceUsd: fromFixed6(raw.alpPriceUsd as string),
    alpTotalSupply: fromFixed6(raw.alpTotalSupply as string),
    custodies: custodies.map((c) => ({
      pubkey: c.pubkey as string,
      symbol: c.symbol as string,
      name: c.name as string,
      mint: c.mint as string,
      aumUsd: fromFixed6(c.aumUsd as string),
      aumTokenAmount: fromFixed6(c.aumTokenAmount as string),
      currentWeightagePct: parseFloat(c.currentWeightagePct as string),
      targetWeightagePct: parseFloat(c.targetWeightagePct as string),
      utilizationPct: parseFloat(c.utilizationPct as string),
      owned: fromFixed6(c.owned as string),
      locked: fromFixed6(c.locked as string),
    })),
  };
}

/** Fetch 24h pool statistics */
export async function getPoolStats(): Promise<AdrenaPoolStats> {
  const raw = await apiFetch<Record<string, number>>('/pool-high-level-stats');
  return {
    totalLiquidityUsdc: raw.total_volume_usd,
    openInterestLong: 0,
    openInterestShort: 0,
    volumeUsdc24h: raw.daily_volume_usd,
    feesUsdc24h: raw.daily_fee_usd,
  };
}
