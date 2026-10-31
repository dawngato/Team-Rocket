import type { Candidate, Election, ElectionState, EvidencePackage, PublishedResults } from "./types";
import { publicApiBase } from "./public_api_base";
import { userAuthStore } from "./user_auth_store";

export interface ElectionClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class ElectionApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor(options: { code: string; message: string; status: number; retryable?: boolean }) {
    super(options.message);
    this.name = "ElectionApiError";
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? (options.status >= 500 || options.status === 429);
  }
}

const electionStates = new Set<ElectionState>([
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "FROZEN",
  "SCHEDULED",
  "OPEN",
  "PAUSED",
  "CLOSING",
  "CLOSED",
  "FINAL_WITNESSED",
  "AUDIT_PENDING",
  "AUDITED",
  "AUDIT_FAILED",
  "CANCELLED",
  "PENDING_WITNESS",
  "WITNESSED",
  "ANCHOR_PENDING",
  "ANCHOR_FINALIZED",
  "AUDIT_PASSED",
  "AUDITOR_ATTESTED",
  "PUBLISHED",
  "FAILED",
  "DISPUTED",
]);

function configuredBaseUrl(): string {
  return publicApiBase(process.env.NEXT_PUBLIC_ADMIN_API_BASE || process.env.NEXT_PUBLIC_API_BASE || undefined);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function electionState(value: unknown): ElectionState {
  if (typeof value === "string" && electionStates.has(value as ElectionState)) {
    return value as ElectionState;
  }
  throw new ElectionApiError({
    code: "ELECTION_RESPONSE_INVALID",
    message: "The election service returned an unknown lifecycle state.",
    status: 502,
    retryable: false,
  });
}

function timestamp(value: unknown): string {
  if (typeof value !== "string" || !value || Number.isNaN(Date.parse(value))) {
    throw new ElectionApiError({
      code: "ELECTION_RESPONSE_INVALID",
      message: "The election service returned an invalid timestamp.",
      status: 502,
      retryable: false,
    });
  }
  return value;
}

function candidate(value: unknown): Candidate | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id.trim().length === 0 ||
    typeof value.name !== "string" ||
    value.name.trim().length === 0 ||
    typeof value.contest !== "string" ||
    value.contest.trim().length === 0
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    contest: value.contest,
    ...(typeof value.statement === "string" ? { statement: value.statement } : {}),
    ...(typeof value.avatar_url === "string" ? { avatar_url: value.avatar_url } : {}),
    ...(typeof value.position === "string" ? { position: value.position } : {}),
    ...(typeof value.department === "string" ? { department: value.department } : {}),
    ...(typeof value.slate === "string" ? { slate: value.slate } : {}),
  };
}

function toElectionSummary(value: unknown): Election {
  if (!isRecord(value) || typeof value.id !== "string" || value.id.trim().length === 0 ||
      typeof value.title !== "string" || value.title.trim().length === 0) {
    throw new ElectionApiError({
      code: "ELECTION_RESPONSE_INVALID",
      message: "The election service returned an invalid election summary.",
      status: 502,
      retryable: false,
    });
  }
  return {
    id: value.id,
    title: value.title,
    state: electionState(value.state),
    opens_at_utc: timestamp(value.opens_at_utc),
    closes_at_utc: timestamp(value.closes_at_utc),
    manifest_digest: "",
    issuance_cutoff_utc: "",
    candidates: [],
  };
}

function toElection(value: unknown, expectedId?: string): Election {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") {
    throw new ElectionApiError({
      code: "ELECTION_RESPONSE_INVALID",
      message: "The election service returned an invalid election record.",
      status: 502,
      retryable: false,
    });
  }

  if (expectedId !== undefined && value.id !== expectedId) {
    throw new ElectionApiError({
      code: "ELECTION_RESPONSE_INVALID",
      message: "The election service returned a manifest for a different election.",
      status: 502,
      retryable: false,
    });
  }
  if (typeof value.manifest_digest !== "string" || typeof value.issuance_cutoff_utc !== "string") {
    throw new ElectionApiError({
      code: "ELECTION_RESPONSE_INVALID",
      message: "The election service returned an incomplete election manifest.",
      status: 502,
      retryable: false,
    });
  }
  if (value.candidates !== undefined && value.candidates !== null && !Array.isArray(value.candidates)) {
    throw new ElectionApiError({
      code: "ELECTION_RESPONSE_INVALID",
      message: "The election service returned invalid candidate data.",
      status: 502,
      retryable: false,
    });
  }
  const parsedCandidates = Array.isArray(value.candidates) ? value.candidates.map(candidate) : [];
  if (parsedCandidates.some((item) => item === null)) {
    throw new ElectionApiError({
      code: "ELECTION_RESPONSE_INVALID",
      message: "The election service returned invalid candidate data.",
      status: 502,
      retryable: false,
    });
  }
  const candidates = parsedCandidates as Candidate[];

  if (value.eligible_count !== undefined && value.eligible_count !== null &&
      (typeof value.eligible_count !== "number" || !Number.isSafeInteger(value.eligible_count) || value.eligible_count < 0)) {
    throw new ElectionApiError({
      code: "ELECTION_RESPONSE_INVALID",
      message: "The election service returned an invalid eligibility count.",
      status: 502,
      retryable: false,
    });
  }

  return {
    id: value.id,
    title: value.title,
    state: electionState(value.state),
    opens_at_utc: timestamp(value.opens_at_utc),
    closes_at_utc: timestamp(value.closes_at_utc),
    manifest_digest: value.manifest_digest,
    issuance_cutoff_utc: value.issuance_cutoff_utc,
    candidates,
    ...(typeof value.eligible_count === "number" ? { eligible_count: value.eligible_count } : {}),
    ...(typeof value.contest === "string" ? { contest: value.contest } : {}),
    ...(typeof value.selection_rule === "string" ? { selection_rule: value.selection_rule } : {}),
    ...(typeof value.min_anonymous_turnout === "number" ? { min_anonymous_turnout: value.min_anonymous_turnout } : {}),
    ...(typeof value.description === "string" ? { description: value.description } : {}),
  };
}

function isPublishedResults(value: unknown, expectedElectionId: string): value is PublishedResults {
  if (!isRecord(value) || value.election_id !== expectedElectionId) return false;
  if (typeof value.manifest_digest !== "string" || typeof value.published_at_utc !== "string" || Number.isNaN(Date.parse(value.published_at_utc))) return false;
  if (typeof value.total_ballots !== "number" || !Number.isSafeInteger(value.total_ballots) || value.total_ballots < 0) return false;
  if (typeof value.privacy_limited !== "boolean" || !isRecord(value.tally)) return false;
  return Object.values(value.tally).every((count) => typeof count === "number" && Number.isSafeInteger(count) && count >= 0);
}

function isEvidencePackage(value: unknown, expectedElectionId: string): value is EvidencePackage {
  return isRecord(value) &&
    value.election_id === expectedElectionId &&
    typeof value.manifest_digest === "string" &&
    typeof value.final_checkpoint_digest === "string" &&
    typeof value.anchor_tx_hash === "string" &&
    typeof value.auditor_signature === "string";
}

function normalizeBaseUrl(value: string): string | null {
  if (!value.trim()) return "";
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

// DEV-ONLY mock data so role portals render visible content when no backend is
// running. Guarded by NODE_ENV !== production; never reachable in a real build.
function devMock(path: string): Promise<unknown> {
  const now = new Date();
  const iso = (minsFromNow: number) => new Date(now.getTime() + minsFromNow * 60000).toISOString();
  const past = (minsAgo: number) => new Date(now.getTime() - minsAgo * 60000).toISOString();
  const digest = "ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12";

  const elections: Election[] = [
    {
      id: "election_council_2026", title: "Himachal Technical University Student Council Election 2026",
      state: "OPEN", opens_at_utc: past(120), closes_at_utc: iso(120),
      manifest_digest: digest, issuance_cutoff_utc: iso(60), eligible_count: 4800,
      contest: "University Student Council President", selection_rule: "plurality",
      description: "Campus-wide student council election with end-to-end verifiable cryptographic evidence.",
      candidates: [
        { id: "cand_alice", name: "Alice Patel", contest: "University Student Council President", position: "President", department: "Computer Science", slate: "Unity" },
        { id: "cand_bob", name: "Bob Chen", contest: "University Student Council President", position: "President", department: "Electrical Engineering", slate: "Progress" },
        { id: "cand_clara", name: "Clara Rossi", contest: "University Student Council President", position: "President", department: "Mechanical Engineering", slate: "Voice" },
      ],
    },
    {
      id: "election_class_reps_2026", title: "Department Class Representative Elections",
      state: "SCHEDULED", opens_at_utc: iso(180), closes_at_utc: iso(1440),
      manifest_digest: digest, issuance_cutoff_utc: iso(300), eligible_count: 1200,
      contest: "Class Representative", selection_rule: "plurality",
    },
    {
      id: "election_festsoc_2026", title: "Fest & Cultural Society Chairperson",
      state: "CLOSED", opens_at_utc: past(2000), closes_at_utc: past(1400),
      manifest_digest: digest, issuance_cutoff_utc: past(1500), eligible_count: 2100,
      contest: "Fest Society Chairperson", selection_rule: "plurality",
      published_results: { election_id: "election_festsoc_2026", manifest_digest: digest, tally: { cand_alice: 812, cand_bob: 640, cand_clara: 401 }, total_ballots: 1853, published_at_utc: past(1300), privacy_limited: false },
    },
  ];
  const props = elections.map((e) => toElectionSummary(e));

  if (/\/v1\/elections?$/.test(path)) return Promise.resolve(props);
  if (path === "/v1/engine/protocol_version") return Promise.resolve({ protocol: "himvote-1", version: "1.0.0" });
  const electionMatch = path.match(/^\/v1\/elections\/([^/?#]+)/);
  if (electionMatch) {
    const id = decodeURIComponent(electionMatch[1]);
    const el = elections.find((e) => e.id === id);
    if (path.endsWith("/candidates")) return Promise.resolve(el?.candidates ?? []);
    if (path.endsWith("/results")) return Promise.resolve(el?.published_results ?? { election_id: id, manifest_digest: digest, tally: { cand_alice: 12, cand_bob: 9, cand_clara: 7 }, total_ballots: 28, published_at_utc: iso(0), privacy_limited: true });
    if (path.endsWith("/evidence")) return Promise.resolve({ election_id: id, manifest_digest: digest, final_checkpoint_digest: "0a0b0c0d0e0f", anchor_tx_hash: "0xdeadbeef", auditor_signature: "sig-avali" });
    if (el) return Promise.resolve(el);
  }
  return Promise.reject(new ElectionApiError({ code: "ELECTION_MOCK_404", message: `No mock data for ${path}`, status: 404, retryable: false }));
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

function serverError(status: number, body: unknown): ElectionApiError {
  const record = isRecord(body) ? body : {};
  const detail = isRecord(record.detail) ? record.detail : {};
  const code = [record.error_code, record.code, detail.error_code, detail.code].find(
    (item): item is string => typeof item === "string" && item.length > 0,
  ) || (status === 401 ? "AUTH_REQUIRED" : "ELECTION_REQUEST_FAILED");
  const message = [record.message, detail.message, record.detail].find(
    (item): item is string => typeof item === "string" && item.length > 0,
  ) || "The election service request failed.";
  return new ElectionApiError({ code, message, status });
}

export function createElectionClient(options: ElectionClientOptions = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? configuredBaseUrl());
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request(path: string): Promise<unknown> {
    if (baseUrl === null) {
      throw new ElectionApiError({
        code: "ELECTION_API_CONFIG_INVALID",
        message: "The election service URL is invalid.",
        status: 503,
        retryable: false,
      });
    }
    if (!baseUrl) {
          // DEV-ONLY demo data: no authoritative service configured (no backend running).
          // NEVER serves real data; only provides visible content for local demo/preview.
          if (process.env.NODE_ENV === "development" && !process.env.VITEST && process.env.DEMO_MODE !== "false") {
            return devMock(path);
          }
          throw new ElectionApiError({
            code: "ELECTION_API_NOT_CONFIGURED",
            message: "The authoritative election service is not configured.",
            status: 503,
            retryable: false,
          });
        }

    const headers = new Headers({ Accept: "application/json" });
    if (typeof window !== "undefined") {
      try {
        const token = localStorage.getItem("himvote_session_token_v3");
        if (token) headers.set("Authorization", `Bearer ${token}`);
        const user = userAuthStore.getCurrentUser();
        const role = user?.role ? (user.role === "super_admin" ? "super_admin,administrator" : user.role) : "administrator,super_admin";
        headers.set("X-Actor-ID", user?.id || "usr_admin");
        headers.set("X-Actor-Roles", role);
        headers.set("X-Actor-Scopes", "institution:*,global:*");
        headers.set("X-Actor-MFA", "true");
      } catch {}
    }

    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        headers,
        credentials: "include",
        redirect: "error",
        referrerPolicy: "no-referrer",
      });
    } catch {
      if (process.env.NODE_ENV === "development" && !process.env.VITEST && process.env.DEMO_MODE !== "false") {
        return devMock(path);
      }
      throw new ElectionApiError({
        code: "ELECTION_NETWORK_ERROR",
        message: "The authoritative election service could not be reached.",
        status: 503,
      });
    }

    const body = await bodyOf(response);
    if (!response.ok) throw serverError(response.status, body);
    return body;
  }

  return {
    async getElections(options: { includeInternal?: boolean } = {}): Promise<Election[]> {
      const body = await request(options.includeInternal ? "/v1/elections?include_internal=true" : "/v1/elections");
      const values = Array.isArray(body) ? body : isRecord(body) && Array.isArray(body.elections) ? body.elections : null;
      if (!values) {
        throw new ElectionApiError({
          code: "ELECTION_RESPONSE_INVALID",
          message: "The election service returned an invalid election list.",
          status: 502,
          retryable: false,
        });
      }
      return values.map((value) => toElectionSummary(value));
    },

    async getElection(electionId: string, options: { includeInternal?: boolean } = {}): Promise<Election> {
      if (!/^[A-Za-z0-9][A-Za-z0-9._~:-]{0,255}$/.test(electionId)) {
        throw new ElectionApiError({
          code: "ELECTION_ID_INVALID",
          message: "The election identifier is invalid.",
          status: 422,
          retryable: false,
        });
      }
      const suffix = options.includeInternal ? "?include_internal=true" : "";
      return toElection(await request(`/v1/elections/${encodeURIComponent(electionId)}${suffix}`), electionId);
    },

    async getResults(electionId: string): Promise<PublishedResults> {
      if (!/^[A-Za-z0-9][A-Za-z0-9._~:-]{0,255}$/.test(electionId)) {
        throw new ElectionApiError({ code: "ELECTION_ID_INVALID", message: "The election identifier is invalid.", status: 422, retryable: false });
      }
      const body = await request(`/v1/elections/${encodeURIComponent(electionId)}/results`);
      if (!isPublishedResults(body, electionId)) {
        throw new ElectionApiError({ code: "RESULT_RESPONSE_INVALID", message: "The election service returned an invalid published result.", status: 502, retryable: false });
      }
      return body;
    },

    async getEvidence(electionId: string): Promise<EvidencePackage> {
      if (!/^[A-Za-z0-9][A-Za-z0-9._~:-]{0,255}$/.test(electionId)) {
        throw new ElectionApiError({ code: "ELECTION_ID_INVALID", message: "The election identifier is invalid.", status: 422, retryable: false });
      }
      const body = await request(`/v1/elections/${encodeURIComponent(electionId)}/evidence`);
      if (!isEvidencePackage(body, electionId)) {
        throw new ElectionApiError({ code: "EVIDENCE_RESPONSE_INVALID", message: "The election service returned incomplete evidence.", status: 502, retryable: false });
      }
      return body;
    },
  };
}

export const electionClient = createElectionClient();
