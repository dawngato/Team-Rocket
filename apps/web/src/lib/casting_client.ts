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
  signal?: AbortSignal;
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

const MAX_ELECTION_ID_LENGTH = 256;
const MAX_RECEIPT_HANDLE_LENGTH = 256;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const MAX_BALLOT_FIELD_LENGTH = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TIMEOUT_MS = 120_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBase64Url(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_BALLOT_FIELD_LENGTH) {
    return false;
  }
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(value)) return false;

  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  const unpaddedLength = value.length - padding;
  if (unpaddedLength % 4 === 1) return false;
  if (padding > 0 && value.length % 4 !== 0) return false;
  if (padding === 1 && unpaddedLength % 4 !== 3) return false;
  if (padding === 2 && unpaddedLength % 4 !== 2) return false;
  return true;
}

function isOpaqueIdentifier(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    /^[A-Za-z0-9][A-Za-z0-9._~:-]*$/.test(value)
  );
}

function isHexDigest(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

function isIdempotencyKey(value: unknown): value is string {
  return isOpaqueIdentifier(value, MAX_IDEMPOTENCY_KEY_LENGTH);
}

function canonicalRequest(value: unknown): CastBallotRequest | null {
  if (!isRecord(value)) return null;
  const request = value;
  if (
    !isOpaqueIdentifier(request.election_id, MAX_ELECTION_ID_LENGTH) ||
    !isBase64Url(request.credential_proof_b64url) ||
    !isBase64Url(request.engine_ballot_b64url) ||
    !isBase64Url(request.engine_proofs_b64url) ||
    !isIdempotencyKey(request.idempotency_key)
  ) {
    return null;
  }

  // Build an allowlisted payload. Runtime callers can pass extra fields even
  // though TypeScript says they cannot; none of those fields may cross into
  // the casting trust domain.
  return {
    election_id: request.election_id,
    credential_proof_b64url: request.credential_proof_b64url,
    engine_ballot_b64url: request.engine_ballot_b64url,
    engine_proofs_b64url: request.engine_proofs_b64url,
    idempotency_key: request.idempotency_key,
  };
}

function isRequest(value: unknown): value is CastBallotRequest {
  return canonicalRequest(value) !== null;
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
  const request = canonicalRequest(handoff);
  if (!request) return null;
  return { type: ENGINE_HANDOFF_TYPE, ...request };
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function defaultErrorCode(status: number): string {
  if (status === 408) return "CASTING_REQUEST_TIMEOUT";
  if (status === 409) return "CAST_REJECTED";
  if (status === 401) return "CASTING_UNAUTHORIZED";
  if (status === 403) return "CASTING_FORBIDDEN";
  if (status === 404) return "CASTING_NOT_FOUND";
  if (status === 429) return "CASTING_RATE_LIMITED";
  return status >= 500 ? "CASTING_SERVICE_UNAVAILABLE" : "CASTING_REQUEST_FAILED";
}

function errorFromResponse(status: number, body: unknown, requestId?: string): CastingApiError {
  const payload = isRecord(body) ? body : {};
  const nested = isRecord(payload.detail) ? payload.detail : {};
  const detailText = typeof payload.detail === "string" ? payload.detail : undefined;
  const directText = typeof body === "string" ? body : undefined;
  const code = firstString(
    payload.error_code,
    payload.code,
    payload.error,
    nested.error_code,
    nested.code,
  ) || defaultErrorCode(status);
  const message = firstString(
    payload.message,
    payload.title,
    nested.message,
    nested.detail,
    detailText,
    directText,
  ) || "Casting service request failed";
  const serverRetryable = payload.retryable === false || nested.retryable === false ? false : undefined;
  const bodyRequestId = firstString(payload.request_id, payload.requestId, nested.request_id, nested.requestId);
  return new CastingApiError({
    code,
    message,
    status,
    retryable: serverRetryable ?? (status >= 500 || status === 408 || status === 429),
    requestId: bodyRequestId || requestId,
  });
}

function normalizeBaseUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash) {
      return null;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function isValidTimeout(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value > 0 && value <= MAX_TIMEOUT_MS;
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: unknown; code?: unknown };
  return candidate.name === "AbortError" || candidate.code === "ABORT_ERR";
}

function safeHeaders(init: RequestInit): Headers {
  const headers = new Headers(init.headers);
  // Even though this module never needs caller authorization, strip these
  // headers defensively before a request can reach the separate cast origin.
  for (const name of [
    "authorization",
    "cookie",
    "proxy-authorization",
    "x-api-key",
    "x-auth-token",
    "x-csrf-token",
    "x-session-id",
  ]) {
    headers.delete(name);
  }
  headers.set("Accept", "application/json");
  if (init.body !== undefined && init.body !== null) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

function isCastBallotResponse(value: unknown): value is CastBallotResponse {
  if (!isRecord(value)) return false;
  return (
    (value.status === "COMMITTED_PENDING_WITNESS" || value.status === "WITNESSED") &&
    isOpaqueIdentifier(value.handle, MAX_RECEIPT_HANDLE_LENGTH) &&
    typeof value.leaf_index === "number" &&
    Number.isSafeInteger(value.leaf_index) &&
    value.leaf_index >= 0 &&
    typeof value.nullifier_commitment === "string" &&
    value.nullifier_commitment.length > 0
  );
}

function isReceiptStatusResponse(value: unknown): value is ReceiptStatusResponse {
  if (!isRecord(value)) return false;
  const validStatus = ["COMMITTED_PENDING_WITNESS", "WITNESSED", "ANCHORED", "REJECTED"].includes(
    String(value.status),
  );
  return (
    validStatus &&
    isOpaqueIdentifier(value.handle, MAX_RECEIPT_HANDLE_LENGTH) &&
    typeof value.leaf_index === "number" &&
    Number.isSafeInteger(value.leaf_index) &&
    value.leaf_index >= 0 &&
    (value.tree_size === undefined || value.tree_size === null ||
      (typeof value.tree_size === "number" && Number.isSafeInteger(value.tree_size) && value.tree_size > 0)) &&
    (value.leaf_hash === undefined || value.leaf_hash === null || isHexDigest(value.leaf_hash)) &&
    (value.witnessed_at_utc === undefined || value.witnessed_at_utc === null || typeof value.witnessed_at_utc === "string") &&
    (value.chain_tx_hash === undefined || value.chain_tx_hash === null || typeof value.chain_tx_hash === "string") &&
    (value.merkle_root === undefined || value.merkle_root === null || isHexDigest(value.merkle_root)) &&
    (value.merkle_proof === undefined || value.merkle_proof === null ||
      (Array.isArray(value.merkle_proof) && value.merkle_proof.every((item) => isHexDigest(item))))
  );
}

export function createCastingClient(options: CastingClientOptions = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(options.baseUrl ?? configuredCastingBaseUrl());
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function request<T>(
    path: string,
    init: RequestInit = {},
    validateResponse?: (body: unknown) => body is T,
  ): Promise<T> {
    if (normalizedBaseUrl === null) {
      throw new CastingApiError({
        code: "CASTING_API_CONFIG_INVALID",
        message: "The casting origin URL is invalid. No ballot was submitted.",
        status: 503,
        retryable: false,
      });
    }
    if (!normalizedBaseUrl) {
      throw new CastingApiError({
        code: "CASTING_API_NOT_CONFIGURED",
        message: "The casting origin is not configured. No ballot was submitted.",
        status: 503,
        retryable: false,
      });
    }
    if (!isValidTimeout(timeoutMs)) {
      throw new CastingApiError({
        code: "CASTING_TIMEOUT_CONFIG_INVALID",
        message: "The casting request timeout is invalid. No ballot was submitted.",
        status: 503,
        retryable: false,
      });
    }
    if (options.signal?.aborted) {
      throw new CastingApiError({
        code: "CASTING_REQUEST_ABORTED",
        message: "The casting request was cancelled. Check receipt status before retrying.",
        status: 499,
        retryable: false,
      });
    }

    const controller = new AbortController();
    let timedOut = false;
    let callerAborted = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onCallerAbort = () => {
      callerAborted = true;
      controller.abort();
    };
    options.signal?.addEventListener("abort", onCallerAbort, { once: true });
    try {
      const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
        headers: safeHeaders(init),
      });
      const body = await parseResponseBody(response);
      const requestId = response.headers.get("x-request-id") || undefined;
      if (!response.ok) throw errorFromResponse(response.status, body, requestId);
      if (validateResponse && !validateResponse(body)) {
        throw new CastingApiError({
          code: "CASTING_RESPONSE_INVALID",
          message: "The casting service returned an invalid response. Check receipt status before retrying.",
          status: 502,
          retryable: false,
        });
      }
      return body as T;
    } catch (error) {
      if (error instanceof CastingApiError) throw error;
      if (timedOut || callerAborted || isAbortError(error)) {
        if (callerAborted && !timedOut) {
          throw new CastingApiError({
            code: "CASTING_REQUEST_ABORTED",
            message: "The casting request was cancelled. Check receipt status before retrying.",
            status: 499,
            retryable: false,
          });
        }
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
      options.signal?.removeEventListener("abort", onCallerAbort);
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
      const requestPayload = canonicalRequest(requestBody);
      if (!requestPayload) {
        throw new CastingApiError({
          code: "BALLOT_HANDOFF_INVALID",
          message: "The engine handoff is incomplete. No ballot was submitted.",
          status: 422,
          retryable: false,
        });
      }
      const handoffType = isRecord(requestBody) && requestBody.type === ENGINE_HANDOFF_TYPE
        ? { type: ENGINE_HANDOFF_TYPE }
        : {};
      return request<CastBallotResponse>(
        `/v1/cast/${encodeURIComponent(requestPayload.election_id)}/ballots`,
        {
          method: "POST",
          body: JSON.stringify({ ...handoffType, ...requestPayload }),
          headers: { "Idempotency-Key": requestPayload.idempotency_key },
        },
        isCastBallotResponse,
      );
    },

    async getReceiptStatus(electionId: string, handle: string): Promise<ReceiptStatusResponse> {
      if (!isOpaqueIdentifier(electionId, MAX_ELECTION_ID_LENGTH) || !isOpaqueIdentifier(handle, MAX_RECEIPT_HANDLE_LENGTH)) {
        throw new CastingApiError({
          code: "RECEIPT_REQUEST_INVALID",
          message: "The receipt lookup is invalid. No casting credentials were submitted.",
          status: 422,
          retryable: false,
        });
      }
      return request<ReceiptStatusResponse>(
        `/v1/cast/${encodeURIComponent(electionId)}/receipts/${encodeURIComponent(handle)}`,
        {},
        isReceiptStatusResponse,
      );
    },
  };
}

export const castingClient = createCastingClient();
