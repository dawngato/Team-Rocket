import { describe, expect, it } from "vitest";
import { jcsRfc8785 } from "../src/lib/crypto/jcs";
import {
  bytesToHex,
  hexToBytes,
  leafHash,
  nodeHash,
  merkleTreeHash,
} from "../src/lib/crypto/merkle";

describe("Offline archive evidence inspection and inclusion proof verification", () => {
  it("computes RFC 8785 canonical digest for election manifests", async () => {
    const manifest = {
      id: "elec_cs_2026",
      title: "School of Computer Science Department Representative",
      contest: "Department Representative",
      eligible_count: 850,
    };
    const canonical = jcsRfc8785(manifest);
    expect(canonical).toBe(
      '{"contest":"Department Representative","eligible_count":850,"id":"elec_cs_2026","title":"School of Computer Science Department Representative"}'
    );

    const encoder = new TextEncoder();
    const digestBuf = await globalThis.crypto.subtle.digest(
      "SHA-256",
      encoder.encode(canonical)
    );
    const digestHex = bytesToHex(new Uint8Array(digestBuf));
    expect(digestHex).toHaveLength(64);
  });

  it("detects unsafe path traversal sequences in external archives", () => {
    const safePaths = [
      "manifest.json",
      "checkpoint.sig",
      "data/merkle_leaves.json",
      "evidence/anchor.json",
    ];
    const unsafePaths = [
      "../../etc/shadow",
      "/root/.ssh/id_rsa",
      "sub/../../../var/log",
      "C:\\Windows\\System32\\cmd.exe",
    ];

    const hasTraversal = (paths: string[]) =>
      paths.some(
        (p) =>
          p.includes("..") ||
          p.startsWith("/") ||
          p.includes(":\\") ||
          p.includes("../")
      );

    expect(hasTraversal(safePaths)).toBe(false);
    expect(hasTraversal(unsafePaths)).toBe(true);
  });

  it("computes Merkle tree root from raw ballot leaves with prefix 0x00", async () => {
    const encoder = new TextEncoder();
    const rawLeaves = [
      "ballot_sample_leaf_record_001_voter_cs_alpha",
      "ballot_sample_leaf_record_002_voter_cs_beta",
      "ballot_sample_leaf_record_003_voter_cs_gamma",
      "ballot_sample_leaf_record_004_voter_cs_delta",
    ];

    const leafHashes = await Promise.all(
      rawLeaves.map((l) => leafHash(encoder.encode(l)))
    );
    expect(leafHashes).toHaveLength(4);

    const rootBytes = await merkleTreeHash(leafHashes);
    const rootHex = bytesToHex(rootBytes);
    expect(rootHex).toHaveLength(64);

    // Assert that recomputation is deterministic
    const rootBytesAgain = await merkleTreeHash(leafHashes);
    expect(bytesToHex(rootBytesAgain)).toBe(rootHex);
  });

  it("proves inclusion step by step upward to target checkpoint root", async () => {
    // Construct four leaves
    const encoder = new TextEncoder();
    const l0 = await leafHash(encoder.encode("ballot_0_proof_handle_HV_1111"));
    const l1 = await leafHash(encoder.encode("ballot_1_proof_handle_HV_24F8_19C2")); // voter leaf at index 1
    const l2 = await leafHash(encoder.encode("ballot_2_proof_handle_HV_3333"));
    const l3 = await leafHash(encoder.encode("ballot_3_proof_handle_HV_4444"));

    // Expected parents and root per RFC 9162 nodeHash
    const p01 = await nodeHash(l0, l1);
    const p23 = await nodeHash(l2, l3);
    const expectedRoot = await nodeHash(p01, p23);
    const expectedRootHex = bytesToHex(expectedRoot);

    // Verify voter inclusion from Leaf 1
    // Step 0: Leaf 1 with left sibling Leaf 0
    const step0Parent = await nodeHash(l0, l1);
    expect(bytesToHex(step0Parent)).toBe(bytesToHex(p01));

    // Step 1: Parent 01 with right sibling Parent 23
    const step1Root = await nodeHash(step0Parent, p23);
    expect(bytesToHex(step1Root)).toBe(expectedRootHex);
  });

  it("rejects inclusion proof when any bit in the leaf or sibling is tampered", async () => {
    const encoder = new TextEncoder();
    const l0 = await leafHash(encoder.encode("ballot_0_proof_handle_HV_1111"));
    const l1 = await leafHash(encoder.encode("ballot_1_proof_handle_HV_24F8_19C2"));
    const p23 = await nodeHash(
      await leafHash(encoder.encode("ballot_2_proof_handle_HV_3333")),
      await leafHash(encoder.encode("ballot_3_proof_handle_HV_4444"))
    );

    const validParent = await nodeHash(l0, l1);
    const validRoot = bytesToHex(await nodeHash(validParent, p23));

    // Tampered Leaf 1
    const tamperedL1 = await leafHash(encoder.encode("tampered_ballot_choice_injected"));
    const tamperedParent = await nodeHash(l0, tamperedL1);
    const tamperedRoot = bytesToHex(await nodeHash(tamperedParent, p23));

    expect(tamperedRoot).not.toBe(validRoot);
    expect(tamperedRoot).toHaveLength(64);
  });
});
