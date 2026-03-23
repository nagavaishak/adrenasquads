"use strict";
/**
 * Wrapper around Adrena's public data API.
 * Base URL: https://datapi.adrena.trade
 *
 * All monetary values from the API are returned as strings with 6-decimal
 * fixed-point scaling (e.g. "477615729134" = $477,615.729134).
 * Helper `fromFixed6()` converts them to plain USD numbers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromFixed6 = fromFixed6;
exports.getPositions = getPositions;
exports.getLiquidityInfo = getLiquidityInfo;
exports.getPoolStats = getPoolStats;
const ADRENA_API_BASE = process.env.ADRENA_API_BASE ?? 'https://datapi.adrena.trade';
/** Convert a 6-decimal fixed-point string to a USD float */
function fromFixed6(raw) {
    return Number(raw) / 1000000;
}
// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(path) {
    const url = `${ADRENA_API_BASE}${path}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
        throw new Error(`Adrena API ${res.status} at ${url}`);
    }
    const body = await res.json();
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
async function getPositions(wallet) {
    let raw;
    try {
        raw = await apiFetch(`/get-positions?account=${wallet}`);
    }
    catch (err) {
        // 400 = no open positions for this wallet — treat as empty, not an error
        const msg = String(err);
        if (msg.includes('400'))
            return [];
        throw err;
    }
    if (!Array.isArray(raw))
        return [];
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
        leverage: p.leverage ? Number(p.leverage) / 1000000 : 0,
        liquidationPrice: p.liquidationPrice ? fromFixed6(p.liquidationPrice) : 0,
    }));
}
/**
 * Fetch real-time liquidity info for all custodies.
 * Confirmed working — see /liquidity-info.
 */
async function getLiquidityInfo() {
    const raw = await apiFetch('/liquidity-info');
    const custodies = raw.custodies ?? [];
    return {
        aumUsd: fromFixed6(raw.aumUsd),
        alpPriceUsd: fromFixed6(raw.alpPriceUsd),
        alpTotalSupply: fromFixed6(raw.alpTotalSupply),
        custodies: custodies.map((c) => ({
            pubkey: c.pubkey,
            symbol: c.symbol,
            name: c.name,
            mint: c.mint,
            aumUsd: fromFixed6(c.aumUsd),
            aumTokenAmount: fromFixed6(c.aumTokenAmount),
            currentWeightagePct: parseFloat(c.currentWeightagePct),
            targetWeightagePct: parseFloat(c.targetWeightagePct),
            utilizationPct: parseFloat(c.utilizationPct),
            owned: fromFixed6(c.owned),
            locked: fromFixed6(c.locked),
        })),
    };
}
/** Fetch 24h pool statistics */
async function getPoolStats() {
    const raw = await apiFetch('/pool-high-level-stats');
    return {
        totalLiquidityUsdc: raw.total_volume_usd,
        openInterestLong: 0,
        openInterestShort: 0,
        volumeUsdc24h: raw.daily_volume_usd,
        feesUsdc24h: raw.daily_fee_usd,
    };
}
//# sourceMappingURL=adrena-client.js.map