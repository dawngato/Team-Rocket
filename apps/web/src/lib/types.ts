export type ElectionState =
  | "DRAFT"
  | "REVIEW"
  | "APPROVED"
  | "FROZEN"
  | "SCHEDULED"
  | "OPEN"
  | "PAUSED"
  | "CLOSING"
  | "CLOSED"
  | "PENDING_WITNESS"
  | "FINAL_WITNESSED"
  | "AUDIT_PENDING"
  | "AUDITED"
  | "WITNESSED"
  | "ANCHOR_PENDING"
  | "ANCHOR_FINALIZED"
  | "AUDIT_PASSED"
  | "AUDITOR_ATTESTED"
  | "PUBLISHED"
  | "FAILED"
  | "DISPUTED"
  | "AUDIT_FAILED"
  | "CANCELLED";

export type Role = "public" | "student" | "teacher" | "admin" | "officer" | "auditor" | "superadmin";

export interface Candidate {
  id: string;
  name: string;
  contest: string;
  statement?: string;
  avatar_url?: string;
}

export interface ElectionSummary {
  id: string;
  title: string;
  state: ElectionState;
  opens_at_utc: string;
  closes_at_utc: string;
}

export interface Election extends ElectionSummary {
  manifest_digest: string;
  issuance_cutoff_utc: string;
  eligible_count?: number;
  candidates?: Candidate[];
  contest?: string;
  selection_rule?: string;
  min_anonymous_turnout?: number;
  description?: string;
  published_results?: PublishedResults;
  evidence?: EvidencePackage;
}

export interface CastBallotRequest {
  election_id: string;
  credential_proof_b64url: string;
  engine_ballot_b64url: string;
  engine_proofs_b64url: string;
  idempotency_key: string;
}

export interface CastBallotResponse {
  status: "COMMITTED_PENDING_WITNESS" | "WITNESSED";
  handle: string;
  leaf_index: number;
  nullifier_commitment: string;
}

export interface ReceiptStatusResponse {
  status: "COMMITTED_PENDING_WITNESS" | "WITNESSED" | "ANCHORED" | "REJECTED";
  handle: string;
  leaf_index: number;
  witnessed_at_utc?: string;
  tree_size?: number;
  leaf_hash?: string;
  chain_tx_hash?: string;
  merkle_root?: string;
  merkle_proof?: string[];
}

export interface PublishedResults {
  election_id: string;
  manifest_digest: string;
  tally: Record<string, number>;
  total_ballots: number;
  published_at_utc: string;
  privacy_limited: boolean;
}

export interface EvidencePackage {
  election_id: string;
  manifest_digest: string;
  final_checkpoint_digest: string;
  anchor_tx_hash: string;
  auditor_signature: string;
  evidence_url?: string;
  witness_key_id?: string;
  block_number?: number;
  chain_id?: number;
}

export interface StudentRecord {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  department: string;
  verified: boolean;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
  flagged_reason?: string;
  created_at_utc: string;
}

export interface TeacherRecord {
  id: string;
  faculty_id: string;
  full_name: string;
  department: string;
  role: string;
  active: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp_utc: string;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string;
  status: "PASS" | "FAIL" | "WARNING";
  details: string;
}

export interface TrustedPin {
  id: string;
  label: string;
  service: "WITNESS" | "CHAIN" | "IDENTITY";
  public_key_spki: string;
  algorithm: string;
  pinned_at_utc: string;
  active: boolean;
}

export interface InstitutionRecord {
  id: string;
  name: string;
  code: string;
  campuses: string[];
  active_elections_count: number;
  total_students_enrolled: number;
  primary_domain: string;
  status: "ACTIVE" | "MAINTENANCE";
}

export interface DepartmentRecord {
  id: string;
  code: string;
  name: string;
  campus: string;
  faculty_count: number;
  student_count: number;
  verification_threshold_percent: number;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  full_name: string;
  role: "ADMINISTRATOR" | "SUPER_ADMINISTRATOR";
  scope: string[];
  mfa_enabled: boolean;
  invited_by: string;
  created_at_utc: string;
  last_login_utc: string;
}

export interface RoleRequestRecord {
  id: string;
  requester_name: string;
  requester_email: string;
  requested_role: string;
  scope: string;
  justification: string;
  requested_at_utc: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  dual_control_approver?: string;
}

export interface PolicyConfigRecord {
  id: string;
  key: string;
  title: string;
  description: string;
  value: string | number | boolean;
  category: "SECURITY" | "GOVERNANCE" | "PRIVACY";
  immutable_after_freeze: boolean;
}

export interface ElectionAssignment {
  id: string;
  election_id: string;
  election_title: string;
  faculty_id: string;
  faculty_name: string;
  role: "VERIFICATION_OFFICER" | "ROSTER_REVIEWER" | "SUPERVISOR";
  assigned_department: string;
  assigned_at_utc: string;
}

