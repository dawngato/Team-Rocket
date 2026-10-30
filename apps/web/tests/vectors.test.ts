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
  evaluateInclusionProof,
  hexToBytes,
  leafHash,
  merkleTreeHash,
  nodeHash,
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

  it("uses RFC 8785 UTF-16 key ordering and rejects malformed values", () => {
    const data = loadJson<{
      unicode_sorting_test: {
        input: JcsValue;
        expected_canonical_json: string;
      };
      string_escaping_test: {
        input: JcsValue;
        expected_canonical_hex: string;
      };
    }>("jcs_vectors.json");

    const unicodeCanonical = jcsRfc8785(data.unicode_sorting_test.input);
    expect(unicodeCanonical).toBe(data.unicode_sorting_test.expected_canonical_json);
    expect(bytesToHex(new TextEncoder().encode(jcsRfc8785(data.string_escaping_test.input)))).toBe(
      data.string_escaping_test.expected_canonical_hex,
    );

    const astralKeyA = "\u{1f600}";
    const astralKeyB = "\u{1f601}";
    expect(jcsRfc8785({ [astralKeyB]: 2, [astralKeyA]: 1 })).toBe(
      `{"${astralKeyA}":1,"${astralKeyB}":2}`,
    );
    expect(jcsRfc8785({ z: 1, a: 2 })).toBe(jcsRfc8785({ a: 2, z: 1 }));

    expect(() => jcsRfc8785({ score: 98.5 })).toThrow(/floats/);
    expect(() => jcsRfc8785({ score: Number.NaN })).toThrow(/floats/);
    expect(() => jcsRfc8785({ score: Number.POSITIVE_INFINITY })).toThrow(/floats/);
    expect(() => jcsRfc8785({ count: Number.MAX_SAFE_INTEGER + 1 })).toThrow(/safe integers/);
    expect(() => jcsRfc8785([,] as unknown as JcsValue)).toThrow(/sparse/);
    const arrayWithExtraProperty = [1] as unknown as { [key: string]: unknown };
    arrayWithExtraProperty.extra = true;
    expect(() => jcsRfc8785(arrayWithExtraProperty as JcsValue)).toThrow(/extra properties/);
    const objectWithGetter = {} as { value?: number };
    Object.defineProperty(objectWithGetter, "value", {
      enumerable: true,
      get: () => 1,
    });
    expect(() => jcsRfc8785(objectWithGetter as JcsValue)).toThrow(/data properties/);
    expect(() => jcsRfc8785(new Date() as unknown as JcsValue)).toThrow(/plain objects/);
    expect(() => jcsRfc8785({ value: undefined } as unknown as JcsValue)).toThrow(/Unsupported/);
    expect(() => jcsRfc8785(1n as unknown as JcsValue)).toThrow(/Unsupported/);
    expect(() => jcsRfc8785(String.fromCharCode(0xd800))).toThrow(/unpaired surrogates/);
  });

  it("matches RFC 9162 Merkle tree roots", async () => {
    const data = loadJson<{
      leaf_hashes: string[];
      tree_heads: Record<string, string>;
    }>("merkle_vectors.json");

    const leaves = data.leaf_hashes.map(hexToBytes);
    for (const [sizeKey, expected] of Object.entries(data.tree_heads)) {
      const size = Number(sizeKey.replace("size_", ""));
      expect(bytesToHex(await merkleTreeHash(leaves.slice(0, size)))).toBe(expected);
    }

    const root = await merkleTreeHash(leaves.slice(0, 7));
    leaves[0][0] ^= 0xff;
    expect(bytesToHex(root)).toBe(data.tree_heads.size_7);
  });

  it("rejects malformed digest inputs and invalid hexadecimal data", async () => {
    expect(hexToBytes("")).toEqual(new Uint8Array());
    expect(hexToBytes("0Afe")).toEqual(new Uint8Array([0x0a, 0xfe]));
    expect(() => hexToBytes("0")).toThrow(/Invalid hexadecimal data/);
    expect(() => hexToBytes("not-hex")).toThrow(/Invalid hexadecimal data/);

    const digest = new Uint8Array(32);
    await expect(nodeHash(new Uint8Array(31), digest)).rejects.toThrow(/32-byte SHA-256 digest/);
    await expect(nodeHash(digest, new Uint8Array(33))).rejects.toThrow(/32-byte SHA-256 digest/);
    await expect(merkleTreeHash([new Uint8Array(31)])).rejects.toThrow(/32-byte SHA-256 digest/);
    await expect(merkleTreeHash([,] as unknown as Uint8Array[])).rejects.toThrow(/must not be sparse/);
  });

  it("verifies RFC 9162 inclusion paths from authenticated receipt fields", async () => {
    const data = loadJson<{ leaf_hashes: string[]; tree_heads: Record<string, string> }>(
      "merkle_vectors.json",
    );
    const leaves = data.leaf_hashes.map(hexToBytes);
    const siblingRoot = bytesToHex(await merkleTreeHash(leaves.slice(2, 4)));
    const evaluation = await evaluateInclusionProof({
      leafIndex: 1,
      treeSize: 4,
      leafHashHex: data.leaf_hashes[1],
      proofHex: [data.leaf_hashes[0], siblingRoot],
      expectedRootHex: data.tree_heads.size_4,
    });

    expect(evaluation.valid).toBe(true);
    expect(evaluation.computedRootHex).toBe(data.tree_heads.size_4);
    expect(evaluation.steps).toHaveLength(2);

    const tampered = await evaluateInclusionProof({
      leafIndex: 1,
      treeSize: 4,
      leafHashHex: `${data.leaf_hashes[1].slice(0, 63)}0`,
      proofHex: [data.leaf_hashes[0], siblingRoot],
      expectedRootHex: data.tree_heads.size_4,
    });
    expect(tampered.valid).toBe(false);
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
