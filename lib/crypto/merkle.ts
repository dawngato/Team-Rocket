import { createHash } from 'crypto';

export interface BallotPayload {
  ballotId: string;
  electionId: string;
  candidateId: string;
  receiptHash: string;
  version: string;
}

export interface MerkleProofStep {
  position: 'left' | 'right';
  hash: string;
}

export interface MerkleInclusionProof {
  leafIndex: number;
  leafHash: string;
  proof: MerkleProofStep[];
  root: string;
}

/**
 * Domain separation prefixes to prevent second-preimage attacks
 */
export const LEAF_PREFIX = 'CV:LEAF:v1:';
export const NODE_PREFIX = 'CV:NODE:v1:';

/**
 * Canonical JSON serialization: keys sorted alphabetically, no extra whitespace
 */
export function canonicalizeJson(obj: Record<string, unknown>): string {
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      sortedObj[key] = JSON.parse(canonicalizeJson(val as Record<string, unknown>));
    } else {
      sortedObj[key] = val;
    }
  }
  return JSON.stringify(sortedObj);
}

/**
 * Hash a canonical ballot leaf with domain separation
 */
export function hashBallotLeaf(payload: BallotPayload): string {
  const canonicalJson = canonicalizeJson({
    ballotId: payload.ballotId,
    candidateId: payload.candidateId,
    electionId: payload.electionId,
    receiptHash: payload.receiptHash,
    version: payload.version || '1.0',
  });
  return createHash('sha256')
    .update(LEAF_PREFIX + canonicalJson, 'utf8')
    .digest('hex');
}

/**
 * Hash two internal nodes with domain separation
 */
export function hashInternalNode(left: string, right: string): string {
  return createHash('sha256')
    .update(NODE_PREFIX + left + right, 'utf8')
    .digest('hex');
}

/**
 * Merkle Tree builder
 */
export class MerkleTree {
  private leaves: string[];
  private layers: string[][];

  constructor(leafHashes: string[]) {
    this.leaves = [...leafHashes];
    this.layers = [];
    this.build();
  }

  private build(): void {
    if (this.leaves.length === 0) {
      // Empty tree has a well-defined canonical empty root
      const emptyRoot = createHash('sha256')
        .update('CV:EMPTY_TREE:v1:', 'utf8')
        .digest('hex');
      this.layers = [[emptyRoot]];
      return;
    }

    let currentLayer = [...this.leaves];
    this.layers.push(currentLayer);

    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        if (i + 1 < currentLayer.length) {
          const right = currentLayer[i + 1];
          nextLayer.push(hashInternalNode(left, right));
        } else {
          // Odd leaf rule: pair with itself to preserve deterministic tree height
          nextLayer.push(hashInternalNode(left, left));
        }
      }
      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }
  }

  public getRoot(): string {
    if (this.layers.length === 0 || this.layers[this.layers.length - 1].length === 0) {
      return createHash('sha256').update('CV:EMPTY_TREE:v1:', 'utf8').digest('hex');
    }
    return this.layers[this.layers.length - 1][0];
  }

  public getProof(leafIndex: number): MerkleInclusionProof | null {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      return null;
    }

    const proof: MerkleProofStep[] = [];
    let currentIndex = leafIndex;

    for (let layerIdx = 0; layerIdx < this.layers.length - 1; layerIdx++) {
      const currentLayer = this.layers[layerIdx];
      const isRightSibling = currentIndex % 2 === 1;
      const siblingIndex = isRightSibling ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < currentLayer.length) {
        proof.push({
          position: isRightSibling ? 'left' : 'right',
          hash: currentLayer[siblingIndex],
        });
      } else {
        // Paired with itself
        proof.push({
          position: 'right',
          hash: currentLayer[currentIndex],
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      leafIndex,
      leafHash: this.leaves[leafIndex],
      proof,
      root: this.getRoot(),
    };
  }

  /**
   * Verify an inclusion proof against expected Merkle root
   */
  public static verifyProof(
    leafHash: string,
    proof: MerkleProofStep[],
    expectedRoot: string
  ): boolean {
    let currentHash = leafHash;

    for (const step of proof) {
      if (step.position === 'left') {
        currentHash = hashInternalNode(step.hash, currentHash);
      } else {
        currentHash = hashInternalNode(currentHash, step.hash);
      }
    }

    return currentHash.toLowerCase() === expectedRoot.toLowerCase();
  }
}
