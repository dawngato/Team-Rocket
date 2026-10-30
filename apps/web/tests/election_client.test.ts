import { describe, expect, it } from "vitest";
import { ElectionApiError, createElectionClient } from "../src/lib/election_client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("election client", () => {
  it("maps server election summaries without inventing candidates", async () => {
    const client = createElectionClient({
      baseUrl: "https://identity.example.test",
      fetchImpl: async () => jsonResponse({
        elections: [{
          id: "elec_1",
          title: "Synthetic Council",
          state: "OPEN",
          opens_at_utc: "2026-10-30T09:00:00Z",
          closes_at_utc: "2026-10-30T17:00:00Z",
        }],
      }),
    });

    await expect(client.getElections()).resolves.toEqual([{
      id: "elec_1",
      title: "Synthetic Council",
      state: "OPEN",
      opens_at_utc: "2026-10-30T09:00:00Z",
      closes_at_utc: "2026-10-30T17:00:00Z",
      manifest_digest: "",
      issuance_cutoff_utc: "",
      candidates: [],
    }]);
  });

  it("loads the full manifest and preserves candidate IDs", async () => {
    const calls: string[] = [];
    const client = createElectionClient({
      baseUrl: "https://identity.example.test/",
      fetchImpl: async (input) => {
        calls.push(String(input));
        return jsonResponse({
          id: "elec_1",
          title: "Synthetic Council",
          state: "FROZEN",
          manifest_digest: "sha256:manifest",
          opens_at_utc: "2026-10-30T09:00:00Z",
          closes_at_utc: "2026-10-30T17:00:00Z",
          issuance_cutoff_utc: "2026-10-30T08:00:00Z",
          candidates: [{ id: "cand_a", name: "A", contest: "Council" }],
        });
      },
    });

    const election = await client.getElection("elec_1");
    expect(calls).toEqual(["https://identity.example.test/v1/elections/elec_1"]);
    expect(election.candidates?.[0]?.id).toBe("cand_a");
    expect(election.manifest_digest).toBe("sha256:manifest");
  });

  it("preserves lifecycle states instead of relabeling CLOSED as FAILED", async () => {
    const client = createElectionClient({
      baseUrl: "https://identity.example.test",
      fetchImpl: async () => jsonResponse({
        elections: [{
          id: "elec_closed",
          title: "Closed Synthetic Council",
          state: "CLOSED",
          opens_at_utc: "2026-10-30T09:00:00Z",
          closes_at_utc: "2026-10-30T17:00:00Z",
        }],
      }),
    });

    await expect(client.getElections()).resolves.toEqual([
      expect.objectContaining({ id: "elec_closed", state: "CLOSED" }),
    ]);
  });

  it("rejects unknown lifecycle states instead of assigning a misleading failure state", async () => {
    const client = createElectionClient({
      baseUrl: "https://identity.example.test",
      fetchImpl: async () => jsonResponse({
        elections: [{
          id: "elec_unknown",
          title: "Malformed Council",
          state: "NOT_A_REAL_STATE",
          opens_at_utc: "2026-10-30T09:00:00Z",
          closes_at_utc: "2026-10-30T17:00:00Z",
        }],
      }),
    });

    await expect(client.getElections()).rejects.toMatchObject({
      code: "ELECTION_RESPONSE_INVALID",
      status: 502,
    });
  });

  it("rejects malformed candidate and timestamp data", async () => {
    const client = createElectionClient({
      baseUrl: "https://identity.example.test",
      fetchImpl: async () => jsonResponse({
        id: "elec_1",
        title: "Malformed Council",
        state: "OPEN",
        manifest_digest: "sha256:manifest",
        opens_at_utc: "not-a-timestamp",
        closes_at_utc: "2026-10-30T17:00:00Z",
        issuance_cutoff_utc: "2026-10-30T08:00:00Z",
        candidates: [{ id: "cand_a", name: "A" }],
      }),
    });

    await expect(client.getElection("elec_1")).rejects.toMatchObject({
      code: "ELECTION_RESPONSE_INVALID",
      status: 502,
    });
  });

  it("fails closed when configuration is missing", async () => {
    const client = createElectionClient({ baseUrl: "" });
    await expect(client.getElections()).rejects.toMatchObject({
      code: "ELECTION_API_NOT_CONFIGURED",
      status: 503,
    });
  });

  it("rejects credentials and query fragments in the configured origin", async () => {
    const client = createElectionClient({ baseUrl: "https://user:secret@example.test/path?token=1" });
    await expect(client.getElections()).rejects.toMatchObject({
      code: "ELECTION_API_CONFIG_INVALID",
      status: 503,
    });
  });

  it("returns a typed server error", async () => {
    const client = createElectionClient({
      baseUrl: "https://identity.example.test",
      fetchImpl: async () => jsonResponse({ error_code: "AUTH_REQUIRED", message: "Login required" }, 401),
    });
    const error = await client.getElections().catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ElectionApiError);
    expect(error).toMatchObject({ code: "AUTH_REQUIRED", status: 401 });
  });
});
