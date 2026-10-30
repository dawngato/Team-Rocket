import { describe, expect, it } from "vitest";
import { apiClient } from "../src/lib/api_client";

describe("HimVote API Client and Local Store", () => {
  it("retrieves initial election list", async () => {
    const list = await apiClient.getElections();
    expect(list.length).toBeGreaterThan(0);
    const csElec = list.find((e) => e.id === "elec_cs_2026");
    expect(csElec).toBeDefined();
    expect(csElec?.state).toBe("WITNESSED");
  });

  it("casts a ballot and receives committed pending witness status", async () => {
    const response = await apiClient.castBallot({
      election_id: "elec_su_2026",
      credential_proof_b64url: "dGVzdF9wcm9vZg",
      engine_ballot_b64url: "ZW5jX2JhbGxvdA",
      engine_proofs_b64url: "emtwX3Byb29m",
      idempotency_key: "key_test_123",
    });

    expect(response.status).toBe("COMMITTED_PENDING_WITNESS");
    expect(response.handle).toMatch(/^HV_[A-Z0-9]+_[A-Z0-9]+$/);
    expect(response.leaf_index).toBeGreaterThan(0);
  });

  it("retrieves receipt status and Merkle proof", async () => {
    const receipt = await apiClient.getReceiptStatus("elec_cs_2026", "HV_24F8_19C2");
    expect(receipt.handle).toBe("HV_24F8_19C2");
    expect(receipt.merkle_proof?.length).toBeGreaterThan(0);
  });

  it("retrieves audit events", async () => {
    const events = await apiClient.getAuditEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.action === "WITNESS_CHECKPOINT_SIGN")).toBe(true);
  });
});
