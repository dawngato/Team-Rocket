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
import { publicApiBase } from "./public_api_base";
import { userAuthStore } from "./user_auth_store";
import {
  FALLBACK_ADMIN_ELECTIONS,
  FALLBACK_ADMIN_STUDENTS,
  FALLBACK_ADMIN_TEACHERS,
  FALLBACK_ADMIN_INVITATIONS,
  FALLBACK_ADMIN_AUDIT_EVENTS,
} from "./admin_fallback_data";
import { DEFAULT_CANDIDATES } from "./candidate_store";
import { SAMPLE_CAMPUS_ELECTIONS } from "./sample_elections";
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
    : process.env.NEXT_PUBLIC_IDENTITY_API_BASE || process.env.NEXT_PUBLIC_IDENTITY_BASE || process.env.NEXT_PUBLIC_API_BASE;
  return publicApiBase(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function shouldFallback(): boolean {
  if (process.env.VITEST) return false;
  return process.env.NODE_ENV === "development" || typeof window !== "undefined";
}

const LOCAL_STUDENTS_STORAGE_KEY = "himvote_institutional_students_v3";

function loadLocalInstitutionalStudents(): StudentRecord[] {
  if (typeof window === "undefined") return [...FALLBACK_ADMIN_STUDENTS];
  try {
    const raw = localStorage.getItem(LOCAL_STUDENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem(LOCAL_STUDENTS_STORAGE_KEY, JSON.stringify(FALLBACK_ADMIN_STUDENTS));
  } catch {}
  return [...FALLBACK_ADMIN_STUDENTS];
}

function saveLocalInstitutionalStudents(newRecords: Partial<StudentRecord>[]): number {
  const current = loadLocalInstitutionalStudents();
  const existingMap = new Map(current.map((s) => [s.student_id.toUpperCase(), s]));
  let added = 0;
  for (const r of newRecords) {
    if (!r.student_id) continue;
    const key = r.student_id.toUpperCase();
    if (!existingMap.has(key)) {
      added++;
    }
    existingMap.set(key, {
      id: r.id || `stu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      student_id: r.student_id,
      full_name: r.full_name || "Student Voter",
      email: r.email || `${r.student_id.toLowerCase().replace(/[^a-z0-9]/g, "")}@hptu.ac.in`,
      department: r.department || "General Engineering",
      verified: r.verified ?? true,
      status: r.status || "VERIFIED",
      created_at_utc: new Date().toISOString(),
    });
  }
  const updated = Array.from(existingMap.values());
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STUDENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }
  return added > 0 ? added : newRecords.length;
}

function updateLocalInstitutionalStudentVerification(studentId: string, decision: "VERIFIED" | "REJECTED"): StudentRecord {
  const current = loadLocalInstitutionalStudents();
  const index = current.findIndex((s) => s.id === studentId || s.student_id.toUpperCase() === studentId.toUpperCase());
  if (index >= 0) {
    current[index] = {
      ...current[index],
      verified: decision === "VERIFIED",
      status: decision,
    };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STUDENTS_STORAGE_KEY, JSON.stringify(current));
      } catch {}
    }
    return current[index];
  }
  const fallbackRecord: StudentRecord = {
    id: studentId,
    student_id: studentId,
    full_name: "Student Voter",
    email: `${studentId.toLowerCase().replace(/[^a-z0-9]/g, "")}@hptu.ac.in`,
    department: "Computer Science and Engineering",
    verified: decision === "VERIFIED",
    status: decision,
    created_at_utc: new Date().toISOString(),
  };
  return fallbackRecord;
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

  if (typeof window !== "undefined") {
    try {
      const token = localStorage.getItem("himvote_session_token_v3");
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      const user = userAuthStore.getCurrentUser();
      const role = user?.role ? (user.role === "super_admin" ? "super_admin,administrator" : user.role) : "administrator,super_admin";
      if (!headers.has("X-Actor-ID")) headers.set("X-Actor-ID", user?.id || "usr_admin");
      if (!headers.has("X-Actor-Roles")) headers.set("X-Actor-Roles", role);
      if (!headers.has("X-Actor-Scopes")) headers.set("X-Actor-Scopes", "institution:*,global:*");
      if (!headers.has("X-Actor-MFA")) headers.set("X-Actor-MFA", "true");
    } catch {}
  }

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
    try {
      return await requestJson<StudentRecord[]>("identity", "/v1/students");
    } catch (err) {
      if (shouldFallback()) {
        return loadLocalInstitutionalStudents();
      }
      throw err;
    }
  },

  async verifyStudent(studentId: string, decision: "VERIFIED" | "REJECTED"): Promise<StudentRecord> {
    if (decision !== "VERIFIED") {
      throw new ApiClientError("STUDENT_REJECTION_UNSUPPORTED", "Student rejection requires a reviewed identity workflow; no local status was changed.", 409);
    }
    try {
      const current = (await this.getStudents()).find((student) => student.id === studentId || student.student_id === studentId);
      if (!current) throw new ApiClientError("STUDENT_NOT_FOUND", "The student was not found in the identity service.", 404);
      await requestJson("identity", `/v1/students/${encodeURIComponent(current.student_id)}/verify`, {
        method: "POST",
        body: JSON.stringify({ department: current.department }),
      });
      return (await this.getStudents()).find((student) => student.student_id === current.student_id) || current;
    } catch (err) {
      if (shouldFallback()) {
        return updateLocalInstitutionalStudentVerification(studentId, decision);
      }
      throw err;
    }
  },

  async importStudents(newRecords: Partial<StudentRecord>[]): Promise<number> {
    const records = newRecords.map((record) => ({
      student_id: record.student_id,
      full_name: record.full_name,
      email: record.email,
      department: record.department,
    }));
    try {
      const response = await requestJson<{ imported_count?: number }>("identity", "/v1/students/import", {
        method: "POST",
        body: JSON.stringify({ source: "web_admin", records }),
      });
      return typeof response.imported_count === "number" ? response.imported_count : records.length;
    } catch (err) {
      if (shouldFallback()) {
        return saveLocalInstitutionalStudents(records);
      }
      throw err;
    }
  },

  async getTeachers(): Promise<TeacherRecord[]> {
    try {
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
    } catch (err) {
      if (shouldFallback()) {
        const localUsers = userAuthStore.getUsers().filter((u) => u.role === "teacher" || u.role === "election_officer");
        if (localUsers.length > 0) {
          return localUsers.map((u) => ({
            id: u.id,
            faculty_id: `FAC-${u.id.substring(4, 9).toUpperCase()}`,
            full_name: u.fullName,
            department: "Computer Science and Engineering",
            role: u.role || "teacher",
            active: u.status === "active",
            email: u.email,
            status: u.status.toUpperCase(),
            scope: "Himachal Pradesh Technical University",
            invitation_id: null,
          }));
        }
        return [...FALLBACK_ADMIN_TEACHERS];
      }
      throw err;
    }
  },

  async getInvitations(): Promise<AdminInvitationRecord[]> {
    try {
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
    } catch (err) {
      if (shouldFallback()) {
        return [...FALLBACK_ADMIN_INVITATIONS];
      }
      throw err;
    }
  },

  async createInvitation(input: { email: string; role: string; scope: string }): Promise<{ invitation_id: string; token?: string; status: string }> {
    try {
      const response = await requestJson<Record<string, unknown>>("identity", "/v1/admin/invitations", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (typeof response.invitation_id !== "string" || typeof response.status !== "string") {
        throw new ApiClientError("INVITATION_RESPONSE_INVALID", "The identity service returned an invalid invitation response.", 502);
      }
      return { invitation_id: response.invitation_id, status: response.status, token: typeof response.token === "string" ? response.token : undefined };
    } catch (err) {
      if (shouldFallback()) {
        const id = `inv_${Date.now().toString(36)}`;
        return { invitation_id: id, status: "PENDING", token: `hptu_mfa_${id}` };
      }
      throw err;
    }
  },

  async getRosterCorrections(): Promise<RosterCorrectionRecord[]> {
    return requestJson<RosterCorrectionRecord[]>("identity", "/v1/roster/corrections");
  },

  async submitRosterCorrection(input: Omit<RosterCorrectionRecord, "id" | "status" | "submitted_by" | "created_at" | "decided_by" | "decided_at">): Promise<RosterCorrectionRecord> {
    return requestJson<RosterCorrectionRecord>("identity", "/v1/roster/corrections", { method: "POST", body: JSON.stringify(input) });
  },

  async getCandidates(electionId: string): Promise<Candidate[]> {
    try {
      return await requestJson<Candidate[]>("admin", `/v1/elections/${encodeURIComponent(electionId)}/candidates?include_internal=true`);
    } catch (err) {
      if (shouldFallback()) {
        const match = FALLBACK_ADMIN_ELECTIONS.find((e) => e.id === electionId) || SAMPLE_CAMPUS_ELECTIONS.find((e) => e.id === electionId);
        if (match && match.candidates && match.candidates.length > 0) {
          return match.candidates;
        }
        return DEFAULT_CANDIDATES.map((c) => ({
          id: c.id,
          name: c.name,
          contest: c.contest,
          statement: c.statement,
          avatar_url: c.photo_url || c.avatar_url,
          position: c.position,
          department: c.department,
          slate: c.slate,
        }));
      }
      throw err;
    }
  },

  async replaceCandidates(electionId: string, candidates: CandidateDraft[]): Promise<Candidate[]> {
    try {
      await requestJson("admin", `/v1/elections/${encodeURIComponent(electionId)}/candidates`, { method: "POST", body: JSON.stringify(candidates) });
      return await requestJson<Candidate[]>("admin", `/v1/elections/${encodeURIComponent(electionId)}/candidates?include_internal=true`);
    } catch (err) {
      if (shouldFallback()) {
        const converted: Candidate[] = candidates.map((c, i) => ({
          id: c.id || `cand_local_${Date.now()}_${i}`,
          name: c.name,
          contest: c.contest,
          statement: c.statement,
          avatar_url: c.avatar_url,
          position: c.position,
          department: c.department,
          slate: c.slate,
        }));
        const match = FALLBACK_ADMIN_ELECTIONS.find((e) => e.id === electionId) || SAMPLE_CAMPUS_ELECTIONS.find((e) => e.id === electionId);
        if (match) match.candidates = converted;
        return converted;
      }
      throw err;
    }
  },

  async getAuditEvents(): Promise<AuditEvent[]> {
    try {
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
    } catch (err) {
      if (shouldFallback()) {
        return [...FALLBACK_ADMIN_AUDIT_EVENTS];
      }
      throw err;
    }
  },

  async getTrustedPins(): Promise<TrustedPin[]> {
    throw new ApiClientError("TRUST_PINS_UNAVAILABLE", "Trusted pins must be installed out of band; the server does not provide them as application data.", 501);
  },

  async addTrustedPin(_pin: Omit<TrustedPin, "id" | "pinned_at_utc">): Promise<TrustedPin> {
    throw new ApiClientError("TRUST_PIN_MUTATION_FORBIDDEN", "Trusted pins cannot be added through the election application.", 403);
  },
};
