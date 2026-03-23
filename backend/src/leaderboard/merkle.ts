/**
 * Merkle tree generation for prize distribution.
 * Uses sha256 (matching the on-chain verify_merkle_proof in claim_prize.rs).
 */

import { MerkleTree } from 'merkletreejs';
import crypto from 'crypto';

export interface PrizeLeaf {
  wallet: string;
  amount: number; // in USDC token units (6 decimals)
}

export interface MerkleResult {
  root: Buffer;
  rootHex: string;
  proofs: Map<string, string[]>; // wallet -> hex proof array
}

function hashLeaf(leaf: PrizeLeaf): Buffer {
  // Decode base58 wallet address via hex intermediate
  const walletBuf = Buffer.from(leaf.wallet, 'utf8');
  const amountBuf = Buffer.allocUnsafe(8);
  amountBuf.writeBigUInt64LE(BigInt(leaf.amount), 0);

  return crypto
    .createHash('sha256')
    .update(walletBuf)
    .update(amountBuf)
    .digest();
}

function hashPair(a: Buffer, b: Buffer): Buffer {
  // Sort pairs to ensure deterministic tree (matches on-chain logic)
  const [left, right] = Buffer.compare(a, b) <= 0 ? [a, b] : [b, a];
  return crypto.createHash('sha256').update(left).update(right).digest();
}

/**
 * Build a Merkle tree from prize leaves and return root + per-wallet proofs.
 */
export function buildMerkleTree(leaves: PrizeLeaf[]): MerkleResult {
  const leafBuffers = leaves.map(hashLeaf);

  const tree = new MerkleTree(leafBuffers, hashPair, {
    sort: true,
    hashLeaves: false, // already hashed
  });

  const root = tree.getRoot();
  const rootHex = root.toString('hex');

  const proofs = new Map<string, string[]>();
  leaves.forEach((leaf, i) => {
    const proof = tree.getProof(leafBuffers[i]).map((p) => p.data.toString('hex'));
    proofs.set(leaf.wallet, proof);
  });

  return { root, rootHex, proofs };
}

/**
 * Convert hex root to 32-byte array for on-chain submission.
 */
export function rootToBytes(rootHex: string): number[] {
  return Array.from(Buffer.from(rootHex, 'hex'));
}

/**
 * Convert hex proof array to 32-byte arrays for on-chain submission.
 */
export function proofToBytes(hexProof: string[]): number[][] {
  return hexProof.map((h) => Array.from(Buffer.from(h, 'hex')));
}
