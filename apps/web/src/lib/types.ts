export type ElectionState =
  | "DRAFT"
  | "FROZEN"
  | "OPEN"
  | "PENDING_WITNESS"
  | "WITNESSED"
  | "ANCHOR_PENDING"
  | "ANCHOR_FINALIZED"
  | "AUDIT_PASSED"
  | "AUDITOR_ATTESTED"
  | "FAILED"
  | "DISPUTED";

export type Role = "public" | "student" | "teacher" | "admin" | "officer" | "auditor";

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
