import {
  Election,
  PublishedResults,
  EvidencePackage,
  StudentRecord,
  TeacherRecord,
  AuditEvent,
  TrustedPin,
  CastBallotRequest,
  CastBallotResponse,
  ReceiptStatusResponse,
} from "./types";
import {
  INITIAL_ELECTIONS,
  INITIAL_RESULTS,
  INITIAL_EVIDENCE,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_AUDIT_EVENTS,
  INITIAL_TRUSTED_PINS,
} from "./mock_data";

// Helper for local storage safe access
function safeGetItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore local storage quota errors
  }
}

export const apiClient = {
  // Elections
  async getElections(): Promise<Election[]> {
    return safeGetItem<Election[]>("himvote_elections", INITIAL_ELECTIONS);
  },

  async getElection(id: string): Promise<Election | null> {
    const list = await this.getElections();
    return list.find((e) => e.id === id) || null;
  },

  async createElection(payload: Partial<Election>): Promise<Election> {
    const current = await this.getElections();
    const newElection: Election = {
      id: payload.id || `elec_${Date.now()}`,
      title: payload.title || "Untitled Election",
      state: "DRAFT",
      manifest_digest: `sha256_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      opens_at_utc: payload.opens_at_utc || new Date(Date.now() + 86400000).toISOString(),
      closes_at_utc: payload.closes_at_utc || new Date(Date.now() + 86400000 * 7).toISOString(),
      issuance_cutoff_utc: payload.issuance_cutoff_utc || new Date(Date.now() + 86400000 - 3600000).toISOString(),
      eligible_count: payload.eligible_count || 100,
      contest: payload.contest || "General Council",
      selection_rule: payload.selection_rule || "Plurality voting",
      min_anonymous_turnout: payload.min_anonymous_turnout || 20,
      description: payload.description || "Institutional election",
      candidates: payload.candidates || [],
    };
    const updated = [newElection, ...current];
    safeSetItem("himvote_elections", updated);
    return newElection;
  },

  async freezeElection(id: string): Promise<Election> {
    const current = await this.getElections();
    const updated = current.map((e) => (e.id === id ? { ...e, state: "FROZEN" as const } : e));
    safeSetItem("himvote_elections", updated);
    const target = updated.find((e) => e.id === id)!;
    return target;
  },

  async openElection(id: string): Promise<Election> {
    const current = await this.getElections();
    const updated = current.map((e) => (e.id === id ? { ...e, state: "OPEN" as const } : e));
    safeSetItem("himvote_elections", updated);
    return updated.find((e) => e.id === id)!;
  },

  async closeElection(id: string): Promise<Election> {
    const current = await this.getElections();
    const updated = current.map((e) => (e.id === id ? { ...e, state: "PENDING_WITNESS" as const } : e));
    safeSetItem("himvote_elections", updated);
    return updated.find((e) => e.id === id)!;
  },

  async requestPublication(id: string): Promise<Election> {
    const current = await this.getElections();
    const updated = current.map((e) => (e.id === id ? { ...e, state: "WITNESSED" as const } : e));
    safeSetItem("himvote_elections", updated);
    return updated.find((e) => e.id === id)!;
  },

  // Results
  async getResults(electionId: string): Promise<PublishedResults | null> {
    const all = safeGetItem<Record<string, PublishedResults>>("himvote_results", INITIAL_RESULTS);
    return all[electionId] || null;
  },

  // Evidence
  async getEvidence(electionId: string): Promise<EvidencePackage | null> {
    const all = safeGetItem<Record<string, EvidencePackage>>("himvote_evidence", INITIAL_EVIDENCE);
    return all[electionId] || null;
  },

  // Casting
  async castBallot(req: CastBallotRequest): Promise<CastBallotResponse> {
    const receiptHandle = `HV_${Math.random().toString(36).substring(2, 6).toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const leafIndex = Math.floor(Math.random() * 5000) + 1;
    const response: CastBallotResponse = {
      status: "COMMITTED_PENDING_WITNESS",
      handle: receiptHandle,
      leaf_index: leafIndex,
      nullifier_commitment: `comm_${Math.random().toString(36).substring(2, 15)}`,
    };

    // Store in receipts cache
    const existingReceipts = safeGetItem<Record<string, ReceiptStatusResponse>>("himvote_receipts", {});
    existingReceipts[receiptHandle] = {
      status: "COMMITTED_PENDING_WITNESS",
      handle: receiptHandle,
      leaf_index: leafIndex,
      witnessed_at_utc: undefined,
      merkle_root: "sha256_live_root_batch_pending",
      merkle_proof: [
        "sha256_hash_sibling_level0_a81b2c",
        "sha256_hash_sibling_level1_f4e3d2",
        "sha256_hash_sibling_level2_1098ab",
      ],
    };
    safeSetItem("himvote_receipts", existingReceipts);
    return response;
  },

  async getReceiptStatus(electionId: string, handle: string): Promise<ReceiptStatusResponse> {
    const existing = safeGetItem<Record<string, ReceiptStatusResponse>>("himvote_receipts", {});
    if (existing[handle]) {
      return existing[handle];
    }
    // Default simulated receipt
    return {
      status: "WITNESSED",
      handle,
      leaf_index: 1428,
      witnessed_at_utc: "2026-10-30T10:14:02Z",
      chain_tx_hash: "0x89ab12cd34ef567890123456789abcdef0123456789abcdef0123456789abcdef",
      merkle_root: "sha256_4b9e28f1c8a4d701e65b2a3f9c78d5e0a1b2c3d4e5f60718293a4b5c6d7e8f90",
      merkle_proof: [
        "sha256_sibling_leaf_0_d3f45a",
        "sha256_sibling_leaf_1_b1c2e3",
        "sha256_sibling_subroot_2_9a8b7c",
      ],
    };
  },

  // Students & Roster
  async getStudents(): Promise<StudentRecord[]> {
    return safeGetItem<StudentRecord[]>("himvote_students", INITIAL_STUDENTS);
  },

  async verifyStudent(studentId: string, decision: "VERIFIED" | "REJECTED"): Promise<StudentRecord> {
    const current = await this.getStudents();
    const updated = current.map((s) =>
      s.id === studentId ? { ...s, status: decision, verified: decision === "VERIFIED" } : s
    );
    safeSetItem("himvote_students", updated);
    return updated.find((s) => s.id === studentId)!;
  },

  async importStudents(newRecords: Partial<StudentRecord>[]): Promise<number> {
    const current = await this.getStudents();
    const created: StudentRecord[] = newRecords.map((r, i) => ({
      id: `stu_imp_${Date.now()}_${i}`,
      student_id: r.student_id || `HPTU_2026_GEN_${100 + i}`,
      full_name: r.full_name || "Enrolled Student",
      email: r.email || `student_${i}@hptu.ac.in`,
      department: r.department || "General Engineering",
      verified: true,
      status: "VERIFIED",
      created_at_utc: new Date().toISOString(),
    }));
    safeSetItem("himvote_students", [...current, ...created]);
    return created.length;
  },

  // Teachers
  async getTeachers(): Promise<TeacherRecord[]> {
    return safeGetItem<TeacherRecord[]>("himvote_teachers", INITIAL_TEACHERS);
  },

  // Audit Events
  async getAuditEvents(): Promise<AuditEvent[]> {
    return safeGetItem<AuditEvent[]>("himvote_audit_events", INITIAL_AUDIT_EVENTS);
  },

  // Trusted Pins
  async getTrustedPins(): Promise<TrustedPin[]> {
    return safeGetItem<TrustedPin[]>("himvote_trusted_pins", INITIAL_TRUSTED_PINS);
  },

  async addTrustedPin(pin: Omit<TrustedPin, "id" | "pinned_at_utc">): Promise<TrustedPin> {
    const current = await this.getTrustedPins();
    const newPin: TrustedPin = {
      ...pin,
      id: `pin_${Date.now()}`,
      pinned_at_utc: new Date().toISOString(),
    };
    const updated = [newPin, ...current];
    safeSetItem("himvote_trusted_pins", updated);
    return newPin;
  },
};
