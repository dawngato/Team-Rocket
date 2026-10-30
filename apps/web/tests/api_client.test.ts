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

  it("retrieves audit events", async () => {
    const events = await apiClient.getAuditEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.action === "WITNESS_CHECKPOINT_SIGN")).toBe(true);
  });
});
