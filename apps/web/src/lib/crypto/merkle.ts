const SHA256_DIGEST_BYTES = 32;

function assertUint8Array(value: unknown, name: string): asserts value is Uint8Array {
  if (!(value instanceof Uint8Array)) {
    throw new TypeError(`${name} must be a Uint8Array`);
  }
}

function assertDigest(value: unknown, name: string): asserts value is Uint8Array {
  assertUint8Array(value, name);
  if (value.byteLength !== SHA256_DIGEST_BYTES) {
    throw new TypeError(`${name} must be a 32-byte SHA-256 digest`);
  }
}

export function bytesToHex(bytes: Uint8Array): string {
  assertUint8Array(bytes, "bytes");
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== "string" || !/^[0-9a-f]*$/i.test(hex) || hex.length % 2 !== 0) {
    throw new TypeError("Invalid hexadecimal data");
  }
  return Uint8Array.from({ length: hex.length / 2 }, (_, index) =>
    Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16),
  );
}

async function sha256(value: Uint8Array): Promise<Uint8Array> {
  assertUint8Array(value, "value");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", value);
  return new Uint8Array(digest);
}

export async function leafHash(canonicalBytes: Uint8Array): Promise<Uint8Array> {
  assertUint8Array(canonicalBytes, "canonicalBytes");
  const input = new Uint8Array(canonicalBytes.length + 1);
  input[0] = 0;
  input.set(canonicalBytes, 1);
  return sha256(input);
}

export async function nodeHash(left: Uint8Array, right: Uint8Array): Promise<Uint8Array> {
  assertDigest(left, "left");
  assertDigest(right, "right");
  const input = new Uint8Array(left.length + right.length + 1);
  input[0] = 1;
  input.set(left, 1);
  input.set(right, left.length + 1);
  return sha256(input);
}

async function merkleTreeHashInternal(leaves: Uint8Array[]): Promise<Uint8Array> {
  if (leaves.length === 0) return sha256(new Uint8Array());
  if (leaves.length === 1) return new Uint8Array(leaves[0]);
  const split = 2 ** Math.floor(Math.log2(leaves.length - 1));
  const left = await merkleTreeHashInternal(leaves.slice(0, split));
  const right = await merkleTreeHashInternal(leaves.slice(split));
  return nodeHash(left, right);
}

export async function merkleTreeHash(leaves: Uint8Array[]): Promise<Uint8Array> {
  if (!Array.isArray(leaves)) {
    throw new TypeError("leaves must be an array");
  }

  // Snapshot and validate before the first asynchronous hash so a caller
  // cannot mutate the tree while a root is being computed.
  const snapshot = new Array<Uint8Array>(leaves.length);
  for (let index = 0; index < leaves.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(leaves, index)) {
      throw new TypeError("leaves must not be sparse");
    }
    const leaf = leaves[index];
    assertDigest(leaf, `leaves[${index}]`);
    snapshot[index] = new Uint8Array(leaf);
  }
  return merkleTreeHashInternal(snapshot);
}

export interface InclusionProofStep {
  siblingHex: string;
  direction: "left" | "right";
  computedParentHex: string;
}

export interface InclusionProofEvaluation {
  computedRootHex: string;
  valid: boolean;
  steps: InclusionProofStep[];
}

function assertDigestHex(value: string, name: string): void {
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new TypeError(`${name} must be a 32-byte SHA-256 digest`);
  }
}

/**
 * Evaluate an RFC 9162 audit path using the authenticated tree size and root.
 * The proof contains sibling digests only; the leaf index determines ordering.
 */
export async function evaluateInclusionProof(options: {
  leafIndex: number;
  treeSize: number;
  leafHashHex: string;
  proofHex: string[];
  expectedRootHex: string;
}): Promise<InclusionProofEvaluation> {
  const { leafIndex, treeSize, leafHashHex, proofHex, expectedRootHex } = options;
  if (!Number.isSafeInteger(leafIndex) || leafIndex < 0 || leafIndex >= treeSize) {
    throw new RangeError("leafIndex must be inside the authenticated tree");
  }
  if (!Number.isSafeInteger(treeSize) || treeSize < 1) {
    throw new RangeError("treeSize must be positive");
  }
  assertDigestHex(leafHashHex, "leafHashHex");
  assertDigestHex(expectedRootHex, "expectedRootHex");
  if (!Array.isArray(proofHex)) throw new TypeError("proofHex must be an array");
  proofHex.forEach((sibling, index) => assertDigestHex(sibling, `proofHex[${index}]`));

  let nodeIndex = leafIndex;
  let remaining = treeSize - 1;
  let current = hexToBytes(leafHashHex);
  const steps: InclusionProofStep[] = [];

  for (const siblingHex of proofHex) {
    if (remaining === 0) break;
    const sibling = hexToBytes(siblingHex);
    let direction: InclusionProofStep["direction"];

    if ((nodeIndex & 1) === 1 || nodeIndex === remaining) {
      current = await nodeHash(sibling, current);
      direction = "left";
      if ((nodeIndex & 1) === 0) {
        while ((nodeIndex & 1) === 0 && nodeIndex > 0) {
          nodeIndex >>= 1;
          remaining >>= 1;
        }
      }
    } else {
      current = await nodeHash(current, sibling);
      direction = "right";
    }

    steps.push({
      siblingHex,
      direction,
      computedParentHex: bytesToHex(current),
    });
    nodeIndex >>= 1;
    remaining >>= 1;
  }

  const computedRootHex = bytesToHex(current);
  return {
    computedRootHex,
    valid:
      remaining === 0 &&
      steps.length === proofHex.length &&
      computedRootHex.toLowerCase() === expectedRootHex.toLowerCase(),
    steps,
  };
}
