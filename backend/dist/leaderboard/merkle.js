"use strict";
/**
 * Merkle tree generation for prize distribution.
 * Uses sha256 (matching the on-chain verify_merkle_proof in claim_prize.rs).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMerkleTree = buildMerkleTree;
exports.rootToBytes = rootToBytes;
exports.proofToBytes = proofToBytes;
const merkletreejs_1 = require("merkletreejs");
const crypto_1 = __importDefault(require("crypto"));
function hashLeaf(leaf) {
    // Decode base58 wallet address via hex intermediate
    const walletBuf = Buffer.from(leaf.wallet, 'utf8');
    const amountBuf = Buffer.allocUnsafe(8);
    amountBuf.writeBigUInt64LE(BigInt(leaf.amount), 0);
    return crypto_1.default
        .createHash('sha256')
        .update(walletBuf)
        .update(amountBuf)
        .digest();
}
function hashPair(a, b) {
    // Sort pairs to ensure deterministic tree (matches on-chain logic)
    const [left, right] = Buffer.compare(a, b) <= 0 ? [a, b] : [b, a];
    return crypto_1.default.createHash('sha256').update(left).update(right).digest();
}
/**
 * Build a Merkle tree from prize leaves and return root + per-wallet proofs.
 */
function buildMerkleTree(leaves) {
    const leafBuffers = leaves.map(hashLeaf);
    const tree = new merkletreejs_1.MerkleTree(leafBuffers, hashPair, {
        sort: true,
        hashLeaves: false, // already hashed
    });
    const root = tree.getRoot();
    const rootHex = root.toString('hex');
    const proofs = new Map();
    leaves.forEach((leaf, i) => {
        const proof = tree.getProof(leafBuffers[i]).map((p) => p.data.toString('hex'));
        proofs.set(leaf.wallet, proof);
    });
    return { root, rootHex, proofs };
}
/**
 * Convert hex root to 32-byte array for on-chain submission.
 */
function rootToBytes(rootHex) {
    return Array.from(Buffer.from(rootHex, 'hex'));
}
/**
 * Convert hex proof array to 32-byte arrays for on-chain submission.
 */
function proofToBytes(hexProof) {
    return hexProof.map((h) => Array.from(Buffer.from(h, 'hex')));
}
//# sourceMappingURL=merkle.js.map