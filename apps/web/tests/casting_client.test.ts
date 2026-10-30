import { describe, expect, it } from "vitest";
import {
  CastingApiError,
  ENGINE_HANDOFF_TYPE,
  createCastingClient,
  getEngineHandoffStorageKey,
  parseEngineBallotHandoff,
} from "../src/lib/casting_client";

function response(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

const handoff = {
  type: ENGINE_HANDOFF_TYPE,
  election_id: "elec_test_2026",
  credential_proof_b64url: "Y3JlZGVudGlhbA",
  engine_ballot_b64url: "YmFsbG90",
  engine_proofs_b64url: "cHJvb2Zz",
  idempotency_key: "cast-request-1",
};

describe("casting origin client", () => {
  it("accepts only an election-bound supported-engine handoff", () => {
    expect(parseEngineBallotHandoff(handoff, "elec_test_2026")).toEqual(handoff);
    expect(parseEngineBallotHandoff({ ...handoff, election_id: "other" }, "elec_test_2026")).toBeNull();
    expect(parseEngineBallotHandoff({ ...handoff, engine_proofs_b64url: "not valid" }, "elec_test_2026")).toBeNull();
    expect(getEngineHandoffStorageKey("elec_test_2026")).toBe("himvote.engine.handoff.v1:elec_test_2026");
  });

  it("posts only protocol artifacts to the casting origin without credentials", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const client = createCastingClient({
      baseUrl: "https://casting.example.test",
      fetchImpl: async (input, init) => {
        calls.push({ url: String(input), init });
        return response({
          status: "COMMITTED_PENDING_WITNESS",
          handle: "HV_TEST_1234",
          leaf_index: 3,
          nullifier_commitment: "commitment",
        }, 202);
      },
    });

    const result = await client.castBallot(handoff);
    expect(result.status).toBe("COMMITTED_PENDING_WITNESS");
    expect(calls[0]?.url).toBe("https://casting.example.test/v1/cast/elec_test_2026/ballots");
    expect(calls[0]?.init?.credentials).toBe("omit");
    expect(calls[0]?.init?.headers).toMatchObject({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual(handoff);
  });

  it("does not submit an incomplete handoff", async () => {
    const client = createCastingClient({
      baseUrl: "https://casting.example.test",
      fetchImpl: async () => response({}, 500),
    });

    await expect(client.castBallot({ ...handoff, engine_ballot_b64url: "" })).rejects.toMatchObject({
      code: "BALLOT_HANDOFF_INVALID",
      status: 422,
    });
  });

  it("maps a server rejection to a stable typed error", async () => {
    const client = createCastingClient({
      baseUrl: "https://casting.example.test",
      fetchImpl: async () => response({ error_code: "CREDENTIAL_ALREADY_SPENT", message: "Already used" }, 409, {
        "x-request-id": "req-123",
      }),
    });

    await expect(client.castBallot(handoff)).rejects.toMatchObject({
      code: "CREDENTIAL_ALREADY_SPENT",
      status: 409,
      requestId: "req-123",
      retryable: false,
    });
  });

  it("keeps missing configuration fail closed", async () => {
    const client = createCastingClient({ baseUrl: "" });
    const error = await client.castBallot(handoff).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(CastingApiError);
    expect(error).toMatchObject({ code: "CASTING_API_NOT_CONFIGURED", status: 503 });
  });
});
