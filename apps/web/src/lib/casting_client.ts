import type {
  CastBallotRequest,
  CastBallotResponse,
  ReceiptStatusResponse,
} from "./types";

export const ENGINE_HANDOFF_TYPE = "himvote.engine.ballot.v1" as const;

export interface EngineBallotHandoff extends CastBallotRequest {
  type: typeof ENGINE_HANDOFF_TYPE;
}

export interface CastingClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class CastingApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly requestId?: string;

  constructor(options: {
    code: string;
    message: string;
    status: number;
    retryable?: boolean;
    requestId?: string;
  }) {
    super(options.message);
    this.name = "CastingApiError";
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? (options.status >= 500 || options.status === 429);
    this.requestId = options.requestId;
  }
}

function configuredCastingBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_CASTING_BASE ||
    process.env.NEXT_PUBLIC_API_BASE ||
    ""
  ).replace(/\/$/, "");
}

function isBase64Url(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && /^[A-Za-z0-9_-]+={0,2}$/.test(value);
}

function isRequest(value: unknown): value is CastBallotRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Record<string, unknown>;
  return (
    typeof request.election_id === "string" &&
    request.election_id.length > 0 &&
    isBase64Url(request.credential_proof_b64url) &&
    isBase64Url(request.engine_ballot_b64url) &&
    isBase64Url(request.engine_proofs_b64url) &&
    typeof request.idempotency_key === "string" &&
    request.idempotency_key.length > 0 &&
    request.idempotency_key.length <= 128
  );
}

export function getEngineHandoffStorageKey(electionId: string): string {
  return `himvote.engine.handoff.v1:${electionId}`;
}

export function parseEngineBallotHandoff(
  value: unknown,
  expectedElectionId: string,
): EngineBallotHandoff | null {
  if (!value || typeof value !== "object") return null;
  const handoff = value as Record<string, unknown>;
  if (handoff.type !== ENGINE_HANDOFF_TYPE || handoff.election_id !== expectedElectionId) {
    return null;
  }
  if (!isRequest(handoff)) return null;
  return handoff as unknown as EngineBallotHandoff;
}

function parseResponseBody(response: Response): Promise<unknown> {
  return response
    .json()
    .catch(() => ({}));
}

function errorFromResponse(status: number, body: unknown, requestId?: string): CastingApiError {
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const nested = payload.detail && typeof payload.detail === "object"
    ? (payload.detail as Record<string, unknown>)
    : {};
  const code = String(payload.error_code || nested.error_code || (status === 409 ? "CAST_REJECTED" : "CASTING_REQUEST_FAILED"));
  const message = String(payload.message || nested.message || payload.detail || "Casting service request failed");
  return new CastingApiError({
    code,
    message,
    status,
    requestId: String(payload.request_id || requestId || "") || undefined,
  });
}

export function createCastingClient(options: CastingClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? configuredCastingBaseUrl()).replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15000;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!baseUrl) {
      throw new CastingApiError({
        code: "CASTING_API_NOT_CONFIGURED",
        message: "The casting origin is not configured. No ballot was submitted.",
        status: 503,
        retryable: false,
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        credentials: "omit",
        headers: {
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      });
      const body = await parseResponseBody(response);
      const requestId = response.headers.get("x-request-id") || undefined;
      if (!response.ok) throw errorFromResponse(response.status, body, requestId);
      return body as T;
    } catch (error) {
      if (error instanceof CastingApiError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new CastingApiError({
          code: "CASTING_REQUEST_TIMEOUT",
          message: "The casting service did not respond. Check receipt status before retrying.",
          status: 504,
          retryable: true,
        });
      }
      throw new CastingApiError({
        code: "CASTING_NETWORK_ERROR",
        message: "The casting service could not be reached. Check receipt status before retrying.",
        status: 503,
        retryable: true,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async castBallot(requestBody: CastBallotRequest): Promise<CastBallotResponse> {
      if (!isRequest(requestBody)) {
        throw new CastingApiError({
          code: "BALLOT_HANDOFF_INVALID",
          message: "The engine handoff is incomplete. No ballot was submitted.",
          status: 422,
          retryable: false,
        });
      }
      return request<CastBallotResponse>(
        `/v1/cast/${encodeURIComponent(requestBody.election_id)}/ballots`,
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        },
      );
    },

    async getReceiptStatus(electionId: string, handle: string): Promise<ReceiptStatusResponse> {
      return request<ReceiptStatusResponse>(
        `/v1/cast/${encodeURIComponent(electionId)}/receipts/${encodeURIComponent(handle)}`,
      );
    },
  };
}

export const castingClient = createCastingClient();
