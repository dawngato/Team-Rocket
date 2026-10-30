import { describe, expect, it } from "vitest";
import { apiClient } from "../src/lib/api_client";

describe("HimVote authoritative API client", () => {
  it("fails closed when the election service is not configured", async () => {
    await expect(apiClient.getElections()).rejects.toMatchObject({
      code: "ELECTION_API_NOT_CONFIGURED",
      status: 503,
    });
  });

  it("does not invent an auditor signature for publication", async () => {
    await expect(apiClient.requestPublication("elec_test")).rejects.toMatchObject({
      code: "AUDITOR_SIGNATURE_REQUIRED",
      status: 409,
    });
  });

  it("does not mutate a local store for audit events when the admin API is absent", async () => {
    await expect(apiClient.getAuditEvents()).rejects.toMatchObject({
      code: "ADMIN_API_NOT_CONFIGURED",
      status: 503,
    });
  });
});
