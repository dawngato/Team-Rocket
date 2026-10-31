import type { Election } from "./types";
import type { IssuerPublicKey } from "./credential_crypto";

export interface IdentityClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface CredentialIssuanceStatus {
  election_id: string;
  status: "none" | "RESERVED" | "SIGNING" | "SIGNED" | "DELIVERED";
  delivered: boolean;
}

export interface CredentialIssuanceResponse {
  blind_signature_response: string;
  status: "RESERVED" | "SIGNING" | "SIGNED" | "DELIVERED";
}

export type CredentialIssuerPublicKey = IssuerPublicKey;

export interface LoginResponse {
  session_token: string;
  user_id: string;
  role: string;
  mfa_required: boolean;
}

export interface SessionScope {
  role: string;
  scope_type: string;
  scope_id: string;
}

export interface SessionProfile {
  user_id: string;
  email: string;
  roles: string[];
  scopes: SessionScope[];
  mfa_authenticated: boolean;
}

export interface RegistrationResponse {
  status: string;
  student_id?: string;
  activation_delivery?: "pending" | "development" | "configured";
  development_activation_token?: string;
}

export interface AccountActivationResponse {
  status: string;
  login_enabled: boolean;
}

export interface InvitationRedeemResponse {
  status: string;
  user_id: string;
  role: string;
  scope: string;
  totp_secret?: string;
  totp_uri?: string;
}

export class IdentityApiError extends Error {
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
    this.name = "IdentityApiError";
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? (options.status >= 500 || options.status === 429);
    this.requestId = options.requestId;
  }
}

function configuredBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_IDENTITY_API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE ||
    ""
  ).replace(/\/$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeBaseUrl(value: string): string | null {
  if (!value.trim()) return "";
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash) {
      return null;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function isSafeIdentifier(value: unknown, maxLength = 256): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength && /^[A-Za-z0-9][A-Za-z0-9._~:-]*$/.test(value);
}

function isBase64Url(value: unknown, maxLength = 32768): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength && /^[A-Za-z0-9_-]+$/.test(value);
}

async function bodyOf(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function serverError(status: number, body: unknown, requestId?: string): IdentityApiError {
  const record = isRecord(body) ? body : {};
  const detail = isRecord(record.detail) ? record.detail : {};
  const code = [record.error_code, record.code, detail.error_code, detail.code].find(
    (item): item is string => typeof item === "string" && item.length > 0,
  ) || (status === 401 ? "AUTH_REQUIRED" : "IDENTITY_REQUEST_FAILED");
  const message = [record.message, detail.message, record.detail].find(
    (item): item is string => typeof item === "string" && item.length > 0,
  ) || "The identity service request failed.";
  return new IdentityApiError({ code, message, status, requestId });
}

function parseJsonResponse<T>(body: unknown, valid: (value: unknown) => value is T, message: string): T {
  if (!valid(body)) {
    throw new IdentityApiError({
      code: "IDENTITY_RESPONSE_INVALID",
      message,
      status: 502,
      retryable: false,
    });
  }
  return body;
}

function isCredentialStatus(value: unknown): value is CredentialIssuanceStatus["status"] {
  return value === "none" || value === "RESERVED" || value === "SIGNING" || value === "SIGNED" || value === "DELIVERED";
}

function isCredentialIssuanceStatus(value: unknown): value is CredentialIssuanceStatus {
  return isRecord(value) &&
    typeof value.election_id === "string" &&
    isCredentialStatus(value.status) &&
    typeof value.delivered === "boolean";
}

function isCredentialIssuanceResponse(value: unknown): value is CredentialIssuanceResponse {
  return isRecord(value) &&
    isBase64Url(value.blind_signature_response) &&
    (value.status === "RESERVED" || value.status === "SIGNING" || value.status === "SIGNED" || value.status === "DELIVERED");
}

function isCredentialIssuerPublicKey(value: unknown): value is CredentialIssuerPublicKey {
  return isRecord(value) &&
    typeof value.key_id === "string" &&
    typeof value.algorithm === "string" &&
    typeof value.n === "string" && /^([0-9a-f]+|0x[0-9a-f]+)$/i.test(value.n) &&
    typeof value.e === "number" && Number.isSafeInteger(value.e) && value.e > 1 &&
    typeof value.modulus_len === "number" && Number.isSafeInteger(value.modulus_len) && value.modulus_len >= 128;
}

function isLoginResponse(value: unknown): value is LoginResponse {
  return isRecord(value) &&
    typeof value.session_token === "string" &&
    typeof value.user_id === "string" &&
    typeof value.role === "string" &&
    typeof value.mfa_required === "boolean";
}

function isSessionProfile(value: unknown): value is SessionProfile {
  return isRecord(value) &&
    typeof value.user_id === "string" &&
    typeof value.email === "string" &&
    Array.isArray(value.roles) && value.roles.every((role) => typeof role === "string") &&
    Array.isArray(value.scopes) && value.scopes.every((scope) => isRecord(scope) &&
      typeof scope.role === "string" &&
      typeof scope.scope_type === "string" &&
      typeof scope.scope_id === "string") &&
    typeof value.mfa_authenticated === "boolean";
}

function isRegistrationResponse(value: unknown): value is RegistrationResponse {
  return isRecord(value) && typeof value.status === "string" &&
    (value.activation_delivery === undefined || value.activation_delivery === "pending" || value.activation_delivery === "development" || value.activation_delivery === "configured") &&
    (value.development_activation_token === undefined || isBase64Url(value.development_activation_token));
}

function isAccountActivationResponse(value: unknown): value is AccountActivationResponse {
  return isRecord(value) && typeof value.status === "string" && typeof value.login_enabled === "boolean";
}

function isInvitationRedeemResponse(value: unknown): value is InvitationRedeemResponse {
  return isRecord(value) && typeof value.status === "string" && typeof value.user_id === "string" && typeof value.role === "string" && typeof value.scope === "string";
}

function isRecoveryResponse(value: unknown): value is { status: string } {
  return isRecord(value) && typeof value.status === "string";
}

export interface CredentialEngineHandoff {
  type: "himvote.engine.credential.v1";
  election_id: string;
  blinded_request: string;
}

export const CREDENTIAL_ENGINE_HANDOFF_TYPE = "himvote.engine.credential.v1" as const;

export function getCredentialHandoffStorageKey(electionId: string): string {
  return `himvote.engine.credential.handoff.v1:${electionId}`;
}

export function getCredentialStateStorageKey(electionId: string): string {
  return `himvote.credential.private-state.v1:${electionId}`;
}

export function getCredentialProofStorageKey(electionId: string): string {
  return `himvote.credential.proof.v1:${electionId}`;
}

export function parseCredentialEngineHandoff(value: unknown, expectedElectionId: string): CredentialEngineHandoff | null {
  if (!isRecord(value) || value.type !== CREDENTIAL_ENGINE_HANDOFF_TYPE) return null;
  if (value.election_id !== expectedElectionId || !isSafeIdentifier(value.election_id)) return null;
  if (!isBase64Url(value.blinded_request, 16384)) return null;
  return {
    type: CREDENTIAL_ENGINE_HANDOFF_TYPE,
    election_id: value.election_id,
    blinded_request: value.blinded_request,
  };
}

function isPublishedResult(value: unknown, expectedElectionId: string): value is NonNullable<Election["published_results"]> {
  if (!isRecord(value) || value.election_id !== expectedElectionId) return false;
  if (typeof value.manifest_digest !== "string" || typeof value.published_at_utc !== "string" || Number.isNaN(Date.parse(value.published_at_utc))) return false;
  if (typeof value.total_ballots !== "number" || !Number.isSafeInteger(value.total_ballots) || value.total_ballots < 0) return false;
  if (typeof value.privacy_limited !== "boolean" || !isRecord(value.tally)) return false;
  return Object.values(value.tally).every((count) => typeof count === "number" && Number.isSafeInteger(count) && count >= 0);
}

function isEvidence(value: unknown, expectedElectionId: string): boolean {
  return isRecord(value) &&
    value.election_id === expectedElectionId &&
    typeof value.manifest_digest === "string" &&
    typeof value.final_checkpoint_digest === "string" &&
    typeof value.anchor_tx_hash === "string" &&
    typeof value.auditor_signature === "string";
}

export function createIdentityClient(options: IdentityClientOptions = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? configuredBaseUrl());
  const fetchImpl = options.fetchImpl ?? fetch;
  let inMemorySessionToken: string | null = null;

  async function request<T>(path: string, init: RequestInit, validate: (value: unknown) => value is T, message: string): Promise<T> {
    if (baseUrl === null) {
      throw new IdentityApiError({ code: "IDENTITY_API_CONFIG_INVALID", message: "The identity service URL is invalid.", status: 503, retryable: false });
    }
    if (!baseUrl) {
      throw new IdentityApiError({ code: "IDENTITY_API_NOT_CONFIGURED", message: "The identity service is not configured.", status: 503, retryable: false });
    }
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body !== undefined) headers.set("Content-Type", "application/json");
    if (inMemorySessionToken) headers.set("Authorization", `Bearer ${inMemorySessionToken}`);
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers,
        credentials: "include",
        redirect: "error",
        referrerPolicy: "no-referrer",
      });
    } catch {
      throw new IdentityApiError({ code: "IDENTITY_NETWORK_ERROR", message: "The identity service could not be reached.", status: 503, retryable: true });
    }
    const body = await bodyOf(response);
    if (!response.ok) throw serverError(response.status, body, response.headers.get("x-request-id") || undefined);
    return parseJsonResponse(body, validate, message);
  }

  return {
    async login(email: string, password: string, mfaToken?: string): Promise<LoginResponse> {
      const response = await request("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, ...(mfaToken ? { mfa_token: mfaToken } : {}) }),
      }, isLoginResponse, "The identity service returned an invalid login response.");
      if (response.mfa_required) {
        inMemorySessionToken = null;
      } else if (response.session_token) {
        inMemorySessionToken = response.session_token;
      } else {
        throw new IdentityApiError({ code: "IDENTITY_RESPONSE_INVALID", message: "The identity service did not return an authenticated session.", status: 502, retryable: false });
      }
      return response;
    },

    async logout(): Promise<void> {
      try {
        await request("/v1/auth/logout", { method: "POST" }, (value): value is Record<string, unknown> => isRecord(value) && value.status === "logged_out", "The identity service returned an invalid logout response.");
      } finally {
        inMemorySessionToken = null;
      }
    },

    async getSession(): Promise<SessionProfile> {
      return request("/v1/auth/me", {}, isSessionProfile, "The identity service returned an invalid session profile.");
    },

    async registerStudent(input: { student_id: string; email: string; full_name: string }): Promise<RegistrationResponse> {
      return request("/v1/students/register", { method: "POST", body: JSON.stringify(input) }, isRegistrationResponse, "The identity service returned an invalid registration response.");
    },

    async activateStudent(activationToken: string, password: string): Promise<AccountActivationResponse> {
      return request("/v1/auth/activate", { method: "POST", body: JSON.stringify({ activation_token: activationToken, password }) }, isAccountActivationResponse, "The identity service returned an invalid activation response.");
    },

    async redeemInvitation(invitationToken: string, password: string): Promise<InvitationRedeemResponse> {
      return request("/v1/auth/invitations/redeem", { method: "POST", body: JSON.stringify({ invitation_token: invitationToken, password }) }, isInvitationRedeemResponse, "The identity service returned an invalid invitation response.");
    },

    async resetPassword(token: string, password: string): Promise<{ status: string }> {
      return request("/v1/auth/reset", { method: "POST", body: JSON.stringify({ token, password }) }, isRecoveryResponse, "The identity service returned an invalid recovery response.");
    },

    async requestRecovery(email: string): Promise<{ status: string }> {
      return request("/v1/auth/recover", { method: "POST", body: JSON.stringify({ email }) }, isRecoveryResponse, "The identity service returned an invalid recovery response.");
    },

    async getIssuanceStatus(electionId: string): Promise<CredentialIssuanceStatus> {
      if (!isSafeIdentifier(electionId)) {
        throw new IdentityApiError({ code: "ELECTION_ID_INVALID", message: "The election identifier is invalid.", status: 422, retryable: false });
      }
      const response = await request(`/v1/credentials/issuance-status?election_id=${encodeURIComponent(electionId)}`, {}, isCredentialIssuanceStatus, "The identity service returned an invalid credential status.");
      if (response.election_id !== electionId) {
        throw new IdentityApiError({ code: "IDENTITY_RESPONSE_INVALID", message: "The identity service returned status for a different election.", status: 502, retryable: false });
      }
      return response;
    },

    async getIssuerPublicKey(): Promise<CredentialIssuerPublicKey> {
      return request("/v1/credentials/public-key", {}, isCredentialIssuerPublicKey, "The identity service returned an invalid issuer public key.");
    },

    async issueCredential(handoff: CredentialEngineHandoff): Promise<CredentialIssuanceResponse> {
      const parsed = parseCredentialEngineHandoff(handoff, handoff.election_id);
      if (!parsed) {
        throw new IdentityApiError({ code: "CREDENTIAL_HANDOFF_INVALID", message: "The supported engine credential handoff is invalid. No credential was requested.", status: 422, retryable: false });
      }
      return request("/v1/credentials/issue", { method: "POST", body: JSON.stringify({ election_id: parsed.election_id, blinded_request: parsed.blinded_request }) }, isCredentialIssuanceResponse, "The identity service returned an invalid credential response.");
    },

    async getPublishedResults(electionId: string): Promise<NonNullable<Election["published_results"]>> {
      const response = await request(`/v1/elections/${encodeURIComponent(electionId)}/results`, {}, (value): value is NonNullable<Election["published_results"]> => isPublishedResult(value, electionId), "The election service returned an invalid published result.");
      return response;
    },

    async getEvidence(electionId: string): Promise<Election["evidence"]> {
      const response = await request(`/v1/elections/${encodeURIComponent(electionId)}/evidence`, {}, (value): value is NonNullable<Election["evidence"]> => isEvidence(value, electionId), "The election service returned incomplete evidence.");
      return response;
    },
  };
}

export const identityClient = createIdentityClient();
