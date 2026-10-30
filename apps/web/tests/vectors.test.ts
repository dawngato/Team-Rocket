/**
 * Phase 0 gate: TypeScript must agree with Python golden vectors.
 * Vectors live in packages/test_vectors and are shared across languages.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { jcsRfc8785, type JcsValue } from "../src/lib/crypto/jcs";
import {
  bytesToHex,
  hexToBytes,
  leafHash,
  merkleTreeHash,
} from "../src/lib/crypto/merkle";

const vectorsRoot = resolve(__dirname, "../../../packages/test_vectors");

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(vectorsRoot, name), "utf8")) as T;
}

describe("Phase 0 golden vector agreement (TypeScript)", () => {
  it("matches ballot evidence canonical JSON and leaf hashes", async () => {
    const data = loadJson<{
      vectors: Array<{
        record: JcsValue;
        canonical_json: string;
        canonical_bytes_hex: string;
        leaf_hash: string;
      }>;
    }>("ballot_evidence_vectors.json");

    for (const v of data.vectors) {
      const canon = jcsRfc8785(v.record);
      expect(canon).toBe(v.canonical_json);
      const bytes = new TextEncoder().encode(canon);
      expect(bytesToHex(bytes)).toBe(v.canonical_bytes_hex);
      const leaf = await leafHash(bytes);
      expect(bytesToHex(leaf)).toBe(v.leaf_hash);
    }
  });

  it("matches RFC 9162 Merkle tree roots", async () => {
    const data = loadJson<{
      leaf_hashes: string[];
      tree_roots: Record<string, { merkle_root: string }>;
    }>("merkle_tree_vectors.json");

    const leaves = data.leaf_hashes.map(hexToBytes);
    expect(bytesToHex(await merkleTreeHash([]))).toBe(data.tree_roots.size_0.merkle_root);
    expect(bytesToHex(await merkleTreeHash(leaves.slice(0, 1)))).toBe(
      data.tree_roots.size_1.merkle_root,
    );
    expect(bytesToHex(await merkleTreeHash(leaves.slice(0, 2)))).toBe(
      data.tree_roots.size_2.merkle_root,
    );
    expect(bytesToHex(await merkleTreeHash(leaves.slice(0, 3)))).toBe(
      data.tree_roots.size_3.merkle_root,
    );
    expect(bytesToHex(await merkleTreeHash(leaves.slice(0, 4)))).toBe(
      data.tree_roots.size_4.merkle_root,
    );
  });

  it("matches checkpoint record canonical digests", () => {
    const data = loadJson<{
      checkpoints: Array<{
        record: JcsValue;
        canonical_json: string;
        canonical_bytes_hex: string;
        checkpoint_digest: string;
      }>;
    }>("checkpoint_vectors.json");

    for (const cp of data.checkpoints) {
      const canon = jcsRfc8785(cp.record);
      expect(canon).toBe(cp.canonical_json);
      expect(bytesToHex(new TextEncoder().encode(canon))).toBe(cp.canonical_bytes_hex);
    }
  });
});
