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
    expect(parseEngineBallotHandoff({ ...handoff, student_id: "student-001" }, "elec_test_2026")).toEqual(handoff);
    expect(parseEngineBallotHandoff({ ...handoff, election_id: "other" }, "elec_test_2026")).toBeNull();
    expect(parseEngineBallotHandoff({ ...handoff, engine_proofs_b64url: "not valid" }, "elec_test_2026")).toBeNull();
    expect(parseEngineBallotHandoff({ ...handoff, idempotency_key: "not safe" }, "elec_test_2026")).toBeNull();
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
    expect(calls[0]?.init?.redirect).toBe("error");
    expect(calls[0]?.init?.referrerPolicy).toBe("no-referrer");
    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("idempotency-key")).toBe(handoff.idempotency_key);
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("cookie")).toBeNull();
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual(handoff);
  });

  it("allowlists protocol fields and never forwards identity fields", async () => {
    const calls: Array<{ init?: RequestInit }> = [];
    const client = createCastingClient({
      baseUrl: "https://casting.example.test",
      fetchImpl: async (_input, init) => {
        calls.push({ init });
        return response({
          status: "COMMITTED_PENDING_WITNESS",
          handle: "HV_TEST_1234",
          leaf_index: 3,
          nullifier_commitment: "commitment",
        }, 202);
      },
    });

    await client.castBallot({
      ...handoff,
      student_id: "student-001",
      access_token: "do-not-forward",
    } as typeof handoff & { student_id: string; access_token: string });

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

  it("parses nested and plain-text error responses without coercing objects", async () => {
    const nestedClient = createCastingClient({
      baseUrl: "https://casting.example.test",
      fetchImpl: async () => response({
        detail: { code: "BALLOT_PROOF_INVALID", message: "Proof rejected" },
        request_id: "req-nested",
      }, 422),
    });
    await expect(nestedClient.castBallot(handoff)).rejects.toMatchObject({
      code: "BALLOT_PROOF_INVALID",
      message: "Proof rejected",
      requestId: "req-nested",
      retryable: false,
    });

    const textClient = createCastingClient({
      baseUrl: "https://casting.example.test",
      fetchImpl: async () => new Response("casting unavailable", { status: 503 }),
    });
    await expect(textClient.castBallot(handoff)).rejects.toMatchObject({
      code: "CASTING_SERVICE_UNAVAILABLE",
      message: "casting unavailable",
      retryable: true,
    });
  });

  it("times out once without automatically retrying a cast", async () => {
    let calls = 0;
    const client = createCastingClient({
      baseUrl: "https://casting.example.test",
      timeoutMs: 10,
      fetchImpl: async (_input, init) => {
        calls += 1;
        await new Promise<never>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")), { once: true });
        });
        throw new Error("unreachable");
      },
    });

    await expect(client.castBallot(handoff)).rejects.toMatchObject({
      code: "CASTING_REQUEST_TIMEOUT",
      status: 504,
      retryable: true,
    });
    expect(calls).toBe(1);
  });

  it("distinguishes caller cancellation from a timeout", async () => {
    const abortController = new AbortController();
    const client = createCastingClient({
      baseUrl: "https://casting.example.test",
      timeoutMs: 1000,
      signal: abortController.signal,
      fetchImpl: async (_input, init) => {
        await new Promise<never>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true });
        });
        throw new Error("unreachable");
      },
    });

    const pending = client.castBallot(handoff);
    abortController.abort();
    await expect(pending).rejects.toMatchObject({
      code: "CASTING_REQUEST_ABORTED",
      status: 499,
      retryable: false,
    });
  });

  it("rejects malformed receipt requests and malformed success bodies", async () => {
    const client = createCastingClient({
      baseUrl: "https://casting.example.test",
      fetchImpl: async () => response({ status: "WITNESSED" }, 200),
    });

    await expect(client.getReceiptStatus("", "HV_TEST_1234")).rejects.toMatchObject({
      code: "RECEIPT_REQUEST_INVALID",
      status: 422,
    });
    await expect(client.getReceiptStatus("elec_test_2026", "HV_TEST_1234")).rejects.toMatchObject({
      code: "CASTING_RESPONSE_INVALID",
      status: 502,
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
