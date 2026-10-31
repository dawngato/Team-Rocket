import type {
  AuditEvent,
  CastBallotRequest,
  CastBallotResponse,
  Election,
  EvidencePackage,
  PublishedResults,
  ReceiptStatusResponse,
  StudentRecord,
  TeacherRecord,
  TrustedPin,
  Candidate,
  CandidateDraft,
  AdminInvitationRecord,
  RosterCorrectionRecord,
} from "./types";
import { castingClient } from "./casting_client";
import { electionClient, ElectionApiError } from "./election_client";
export { electionClient };

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 503) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

function configuredBase(name: "admin" | "identity"): string {
  const value = name === "admin"
    ? process.env.NEXT_PUBLIC_ADMIN_API_BASE || process.env.NEXT_PUBLIC_API_BASE
    : process.env.NEXT_PUBLIC_IDENTITY_API_BASE || process.env.NEXT_PUBLIC_API_BASE;
  return (value || "").replace(/\/$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function requestJson<T>(
  service: "admin" | "identity",
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const base = configuredBase(service);
  if (!base) {
    throw new ApiClientError(
      `${service.toUpperCase()}_API_NOT_CONFIGURED`,
      `The ${service} service is not configured. No local demo data was used.`,
    );
  }

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers,
      credentials: "include",
      redirect: "error",
      referrerPolicy: "no-referrer",
    });
  } catch (error) {
    throw new ApiClientError(`${service.toUpperCase()}_NETWORK_ERROR`, `The ${service} service could not be reached.`);
  }

  const text = await response.text().catch(() => "");
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }
  if (!response.ok) {
    const record = isRecord(body) ? body : {};
    const detail = isRecord(record.detail) ? record.detail : {};
    const message = [record.message, detail.message, record.detail].find(
      (value): value is string => typeof value === "string" && value.length > 0,
    ) || `The ${service} service rejected the request.`;
    throw new ApiClientError(
      typeof record.error_code === "string" ? record.error_code : `${service.toUpperCase()}_REQUEST_FAILED`,
      message,
      response.status,
    );
  }
  return body as T;
}

function toElection(value: unknown): Election {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") {
    throw new ApiClientError("ELECTION_RESPONSE_INVALID", "The election service returned an invalid election.", 502);
  }
  return value as unknown as Election;
}

export const apiClient = {
  async getElections(options: { includeInternal?: boolean } = {}): Promise<Election[]> {
    return electionClient.getElections(options);
  },

  async getElection(id: string, options: { includeInternal?: boolean } = {}): Promise<Election | null> {
    try {
      return await electionClient.getElection(id, options);
    } catch (error) {
      if (error instanceof ElectionApiError && error.status === 404) return null;
      throw error;
    }
  },

  async createElection(payload: Partial<Election>): Promise<Election> {
    const body = await requestJson<unknown>("admin", "/v1/elections", {
      method: "POST",
      body: JSON.stringify({
        title: payload.title,
        contest: payload.contest || "General Council",
        selection_rule: payload.selection_rule || "plurality",
        opens_at_utc: payload.opens_at_utc,
        closes_at_utc: payload.closes_at_utc,
        issuance_cutoff_utc: payload.issuance_cutoff_utc,
        min_anonymous_turnout: payload.min_anonymous_turnout,
      }),
    });
    return toElection(body);
  },

  async freezeElection(id: string): Promise<Election> {
    await requestJson("admin", `/v1/elections/${encodeURIComponent(id)}/freeze`, { method: "POST", body: JSON.stringify({}) });
    return electionClient.getElection(id);
  },

  async openElection(id: string): Promise<Election> {
    await requestJson("admin", `/v1/elections/${encodeURIComponent(id)}/open`, { method: "POST" });
    return electionClient.getElection(id);
  },

  async closeElection(id: string): Promise<Election> {
    await requestJson("admin", `/v1/elections/${encodeURIComponent(id)}/close`, { method: "POST" });
    return electionClient.getElection(id);
  },

  async requestPublication(id: string, payload?: { auditor_public_key: string; auditor_signature: string; attestation_data: Record<string, unknown> }): Promise<Election> {
    if (!payload) {
      throw new ApiClientError("AUDITOR_SIGNATURE_REQUIRED", "Publication requires an independently signed auditor attestation; the client will not invent one.", 409);
    }
    const body = await requestJson<unknown>("admin", `/v1/elections/${encodeURIComponent(id)}/publication-request`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!isRecord(body)) throw new ApiClientError("PUBLICATION_RESPONSE_INVALID", "The admin service returned an invalid publication response.", 502);
    return electionClient.getElection(id);
  },

  async getResults(electionId: string): Promise<PublishedResults | null> {
    try {
      return await electionClient.getResults(electionId);
    } catch (error) {
      if (error instanceof ElectionApiError && error.status === 404) return null;
      throw error;
    }
  },

  async getEvidence(electionId: string): Promise<EvidencePackage | null> {
    try {
      return await electionClient.getEvidence(electionId);
    } catch (error) {
      if (error instanceof ElectionApiError && error.status === 404) return null;
      throw error;
    }
  },

  async downloadEvidence(electionId: string): Promise<Blob> {
    const base = configuredBase("admin");
    if (!base) {
      throw new ApiClientError("ADMIN_API_NOT_CONFIGURED", "The admin service is not configured. No local evidence archive was generated.");
    }
    let response: Response;
    try {
      response = await fetch(`${base}/v1/elections/${encodeURIComponent(electionId)}/evidence?download=true`, {
        headers: { Accept: "application/zip" },
        credentials: "include",
        redirect: "error",
        referrerPolicy: "no-referrer",
      });
    } catch {
      throw new ApiClientError("ADMIN_NETWORK_ERROR", "The admin service could not be reached.");
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      let body: unknown = {};
      try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
      const record = isRecord(body) ? body : {};
      throw new ApiClientError(
        typeof record.error_code === "string" ? record.error_code : "EVIDENCE_DOWNLOAD_FAILED",
        typeof record.message === "string" ? record.message : "The evidence archive was not released by the authoritative service.",
        response.status,
      );
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/zip")) {
      throw new ApiClientError("EVIDENCE_RESPONSE_INVALID", "The evidence service did not return a ZIP archive.", 502);
    }
    return response.blob();
  },

  async castBallot(req: CastBallotRequest): Promise<CastBallotResponse> {
    return castingClient.castBallot(req);
  },

  async getReceiptStatus(electionId: string, handle: string): Promise<ReceiptStatusResponse> {
    return castingClient.getReceiptStatus(electionId, handle);
  },

  async getStudents(): Promise<StudentRecord[]> {
    return requestJson<StudentRecord[]>("identity", "/v1/students");
  },

  async verifyStudent(studentId: string, decision: "VERIFIED" | "REJECTED"): Promise<StudentRecord> {
    if (decision !== "VERIFIED") {
      throw new ApiClientError("STUDENT_REJECTION_UNSUPPORTED", "Student rejection requires a reviewed identity workflow; no local status was changed.", 409);
    }
    const current = (await this.getStudents()).find((student) => student.id === studentId || student.student_id === studentId);
    if (!current) throw new ApiClientError("STUDENT_NOT_FOUND", "The student was not found in the identity service.", 404);
    await requestJson("identity", `/v1/students/${encodeURIComponent(current.student_id)}/verify`, {
      method: "POST",
      body: JSON.stringify({ department: current.department }),
    });
    return (await this.getStudents()).find((student) => student.student_id === current.student_id) || current;
  },

  async importStudents(newRecords: Partial<StudentRecord>[]): Promise<number> {
    const records = newRecords.map((record) => ({
      student_id: record.student_id,
      full_name: record.full_name,
      email: record.email,
      department: record.department,
    }));
    const response = await requestJson<{ imported_count?: number }>("identity", "/v1/students/import", {
      method: "POST",
      body: JSON.stringify({ source: "web_admin", records }),
    });
    return typeof response.imported_count === "number" ? response.imported_count : records.length;
  },

  async getTeachers(): Promise<TeacherRecord[]> {
    const rows = await requestJson<Array<Record<string, unknown>>>("identity", "/v1/admin/teachers");
    return rows.map((row) => ({
      id: String(row.user_id || ""),
      faculty_id: String(row.external_id || row.user_id || ""),
      full_name: String(row.email || "Teacher"),
      department: String(row.scope || ""),
      role: String(row.role || "teacher"),
      active: String(row.status || "") === "ACTIVE",
      email: String(row.email || ""),
      status: String(row.status || ""),
      scope: String(row.scope || ""),
      invitation_id: typeof row.invitation_id === "string" ? row.invitation_id : null,
    }));
  },

  async getInvitations(): Promise<AdminInvitationRecord[]> {
    const rows = await requestJson<Array<Record<string, unknown>>>("identity", "/v1/admin/invitations");
    return rows.map((row) => ({
      id: String(row.id || ""),
      email: String(row.email || ""),
      role: String(row.role || ""),
      scope: String(row.scope || ""),
      status: String(row.status || ""),
      delivery_status: String(row.delivery_status || "local_or_dev"),
      expires_at: String(row.expires_at || ""),
      created_at: String(row.created_at || ""),
    }));
  },

  async createInvitation(input: { email: string; role: string; scope: string }): Promise<{ invitation_id: string; token?: string; status: string }> {
    const response = await requestJson<Record<string, unknown>>("identity", "/v1/admin/invitations", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (typeof response.invitation_id !== "string" || typeof response.status !== "string") {
      throw new ApiClientError("INVITATION_RESPONSE_INVALID", "The identity service returned an invalid invitation response.", 502);
    }
    return { invitation_id: response.invitation_id, status: response.status, token: typeof response.token === "string" ? response.token : undefined };
  },

  async getRosterCorrections(): Promise<RosterCorrectionRecord[]> {
    return requestJson<RosterCorrectionRecord[]>("identity", "/v1/roster/corrections");
  },

  async submitRosterCorrection(input: Omit<RosterCorrectionRecord, "id" | "status" | "submitted_by" | "created_at" | "decided_by" | "decided_at">): Promise<RosterCorrectionRecord> {
    return requestJson<RosterCorrectionRecord>("identity", "/v1/roster/corrections", { method: "POST", body: JSON.stringify(input) });
  },

  async getCandidates(electionId: string): Promise<Candidate[]> {
    return requestJson<Candidate[]>("admin", `/v1/elections/${encodeURIComponent(electionId)}/candidates?include_internal=true`);
  },

  async replaceCandidates(electionId: string, candidates: CandidateDraft[]): Promise<Candidate[]> {
    await requestJson("admin", `/v1/elections/${encodeURIComponent(electionId)}/candidates`, { method: "POST", body: JSON.stringify(candidates) });
    return requestJson<Candidate[]>("admin", `/v1/elections/${encodeURIComponent(electionId)}/candidates?include_internal=true`);
  },

  async getAuditEvents(): Promise<AuditEvent[]> {
    const response = await requestJson<{ events?: Array<Record<string, unknown>> }>("admin", "/v1/admin/audit-events");
    return (response.events || []).map((event) => ({
      id: String(event.id || ""),
      timestamp_utc: String(event.timestamp || event.timestamp_utc || ""),
      actor: String(event.actor_id || event.actor || ""),
      action: String(event.action || ""),
      resource_type: "election",
      resource_id: String(isRecord(event.details) && event.details.election_id || ""),
      status: event.result === "SUCCESS" || event.result === "success" ? "PASS" : "WARNING",
      details: JSON.stringify(event.details || {}),
    }));
  },

  async getTrustedPins(): Promise<TrustedPin[]> {
    throw new ApiClientError("TRUST_PINS_UNAVAILABLE", "Trusted pins must be installed out of band; the server does not provide them as application data.", 501);
  },

  async addTrustedPin(_pin: Omit<TrustedPin, "id" | "pinned_at_utc">): Promise<TrustedPin> {
    throw new ApiClientError("TRUST_PIN_MUTATION_FORBIDDEN", "Trusted pins cannot be added through the election application.", 403);
  },
};
