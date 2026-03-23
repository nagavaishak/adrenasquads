/**
 * Merkle tree generation for prize distribution.
 * Uses sha256 (matching the on-chain verify_merkle_proof in claim_prize.rs).
 */
export interface PrizeLeaf {
    wallet: string;
    amount: number;
}
export interface MerkleResult {
    root: Buffer;
    rootHex: string;
    proofs: Map<string, string[]>;
}
/**
 * Build a Merkle tree from prize leaves and return root + per-wallet proofs.
 */
export declare function buildMerkleTree(leaves: PrizeLeaf[]): MerkleResult;
/**
 * Convert hex root to 32-byte array for on-chain submission.
 */
export declare function rootToBytes(rootHex: string): number[];
/**
 * Convert hex proof array to 32-byte arrays for on-chain submission.
 */
export declare function proofToBytes(hexProof: string[]): number[][];
//# sourceMappingURL=merkle.d.ts.map