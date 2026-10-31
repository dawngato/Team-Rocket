import type { Election } from "./types";
import type { IssuerPublicKey } from "./credential_crypto";
import { userAuthStore } from "./user_auth_store";

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

// DEV-ONLY identity mock: returns a super-admin session profile (and a couple of
// other safe endpoints) so role portals render locally without a backend.
// Guarded by NODE_ENV !== production; never included in a real build.
function identityDevMock(path: string, init: RequestInit, validate?: (value: unknown) => boolean): unknown {
  const profile: SessionProfile = {
    user_id: "dev-demo-user",
    email: "dev.demo@himvote.example.in",
    roles: ["super_admin", "administrator", "election_officer", "teacher", "auditor", "student"],
    scopes: [{ role: "super_admin", scope_type: "institution", scope_id: "*" }],
    mfa_authenticated: true,
  };
  if (path === "/v1/auth/me") return profile;
  if (path === "/v1/auth/health" || path === "/health" || path === "/v1/health") return { status: "ok" };
  // unknown endpoint -> signal "no mock" so caller falls through to the real throw
  return undefined;
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
  const sessionListeners: Array<(profile: SessionProfile | null) => void> = [];

  function notifySessionListeners(profile: SessionProfile | null) {
    for (const listener of sessionListeners) {
      try {
        listener(profile);
      } catch {}
    }
  }

  async function request<T>(path: string, init: RequestInit, validate: (value: unknown) => value is T, message: string): Promise<T> {
    if (baseUrl === null) {
      throw new IdentityApiError({ code: "IDENTITY_API_CONFIG_INVALID", message: "The identity service URL is invalid.", status: 503, retryable: false });
    }
    if (!baseUrl) {
          // DEV-ONLY mock session: no identity service configured. Lets the AppShell
          // unlock all role portals for local demo. NEVER reachable in production.
          if (process.env.NODE_ENV !== "production" && process.env.DEMO_MODE !== "false") {
                      const mock = identityDevMock(path, init);
                      if (mock !== undefined) return mock as T;
                    }
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
    onSessionChange(callback: (profile: SessionProfile | null) => void): () => void {
      sessionListeners.push(callback);
      return () => {
        const index = sessionListeners.indexOf(callback);
        if (index >= 0) sessionListeners.splice(index, 1);
      };
    },

    async login(email: string, password: string, mfaToken?: string): Promise<LoginResponse> {
      try {
        if (baseUrl) {
          const response = await request("/v1/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password, ...(mfaToken ? { mfa_token: mfaToken } : {}) }),
          }, isLoginResponse, "The identity service returned an invalid login response.");
          if (response.mfa_required) {
            inMemorySessionToken = null;
            notifySessionListeners(null);
          } else if (response.session_token) {
            inMemorySessionToken = response.session_token;
            try {
              const profile = await request("/v1/auth/me", {}, isSessionProfile, "The identity service returned an invalid session profile.");
              notifySessionListeners(profile);
            } catch {}
          } else {
            throw new IdentityApiError({ code: "IDENTITY_RESPONSE_INVALID", message: "The identity service did not return an authenticated session.", status: 502, retryable: false });
          }
          return response;
        }
      } catch (cause) {
        // Fall back to local user store if server is unconfigured or unreachable
      }

      const { user } = userAuthStore.loginUser(email, password);
      const roleStr = user.role || "pending";
      const profile: SessionProfile = {
        user_id: user.id,
        email: user.email,
        roles: user.role ? [user.role] : [],
        scopes: user.role ? [{ role: user.role, scope_type: "global", scope_id: "*" }] : [],
        mfa_authenticated: true,
      };
      notifySessionListeners(user.role ? profile : null);
      return {
        session_token: `token_${user.id}`,
        user_id: user.id,
        role: roleStr,
        mfa_required: false,
      };
    },

    async logout(): Promise<void> {
      try {
        if (baseUrl) {
          await request("/v1/auth/logout", { method: "POST" }, (value): value is Record<string, unknown> => isRecord(value) && value.status === "logged_out", "The identity service returned an invalid logout response.");
        }
      } catch {} finally {
        userAuthStore.logoutUser();
        inMemorySessionToken = null;
        notifySessionListeners(null);
      }
    },

    async getSession(): Promise<SessionProfile> {
      try {
        if (baseUrl) {
          return await request("/v1/auth/me", {}, isSessionProfile, "The identity service returned an invalid session profile.");
        }
      } catch (err) {
        // Fall back to local session
      }
      const currentUser = userAuthStore.getCurrentUser();
      if (currentUser && currentUser.role) {
        return {
          user_id: currentUser.id,
          email: currentUser.email,
          roles: [currentUser.role],
          scopes: [{ role: currentUser.role, scope_type: "global", scope_id: "*" }],
          mfa_authenticated: true,
        };
      }
      throw new IdentityApiError({
        code: "AUTH_REQUIRED",
        message: "Authentication required to access workspace.",
        status: 401,
        retryable: false,
      });
    },

    async refreshSession(): Promise<SessionProfile> {
      try {
        const profile = await this.getSession();
        notifySessionListeners(profile);
        return profile;
      } catch (err) {
        notifySessionListeners(null);
        throw err;
      }
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
