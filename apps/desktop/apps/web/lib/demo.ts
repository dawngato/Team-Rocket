export type DemoView = "overview" | "student" | "admin" | "auditor" | "public";

export type ElectionLifecycle = "DRAFT" | "OPEN" | "CLOSED";

export type ReceiptStatus =
  | "SUBMITTED"
  | "ACCEPTED_PENDING_WITNESS"
  | "WITNESSED"
  | "FINAL_INCLUDED"
  | "TALLIED";

export type AuditStatus = "NOT_CHECKED" | "INTEGRITY_ONLY";

export interface Candidate {
  id: string;
  name: string;
  note: string;
}

export interface DemoElection {
  id: string;
  title: string;
  status: ElectionLifecycle;
  manifestDigest: string;
  candidates: Candidate[];
  openedAt?: string;
  closedAt?: string;
}

export interface Receipt {
  id: string;
  status: ReceiptStatus;
  acceptedAt: string;
  selectionStored: false;
}

export interface AuditCheck {
  label: string;
  status: "OBSERVED" | "NOT_CONNECTED" | "NOT_SUPPORTED";
  detail: string;
}

export interface AuditReview {
  status: AuditStatus;
  reviewedAt?: string;
  checks: AuditCheck[];
}

export interface DemoActivity {
  id: string;
  label: string;
  detail: string;
  tone: "neutral" | "teal" | "amber" | "rose";
  at: string;
}

export interface DemoState {
  election: DemoElection | null;
  receipt: Receipt | null;
  duplicateAttempted: boolean;
  audit: AuditReview;
  activity: DemoActivity[];
}

export interface CastResult {
  state: DemoState;
  accepted: boolean;
  message: string;
}

export const DEMO_CANDIDATES: Candidate[] = [
  {
    id: "candidate-asha-patel",
    name: "Asha Patel",
    note: "Student wellbeing and quieter study spaces",
  },
  {
    id: "candidate-minh-tran",
    name: "Minh Tran",
    note: "Open budgets and accessible campus services",
  },
  {
    id: "candidate-jo-owens",
    name: "Jo Owens",
    note: "Peer-led clubs and a more connected campus",
  },
];

export const INITIAL_DEMO_STATE: DemoState = {
  election: null,
  receipt: null,
  duplicateAttempted: false,
  audit: {
    status: "NOT_CHECKED",
    checks: [],
  },
  activity: [],
};

const now = () => new Date().toISOString();

const activity = (
  label: string,
  detail: string,
  tone: DemoActivity["tone"],
): DemoActivity => ({
  id: `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  label,
  detail,
  tone,
  at: now(),
});

export function createDraft(state: DemoState): DemoState {
  if (state.election) return state;

  const election: DemoElection = {
    id: "election-synthetic-2026",
    title: "Student Union Council · synthetic 2026",
    status: "DRAFT",
    manifestDigest: "demo-manifest-6f41…c18a",
    candidates: DEMO_CANDIDATES,
  };

  return {
    ...state,
    election,
    activity: [activity("Draft created", "Candidates and a synthetic manifest are ready to review.", "teal"), ...state.activity],
  };
}

export function openElection(state: DemoState): DemoState {
  if (!state.election || state.election.status !== "DRAFT") return state;

  return {
    ...state,
    election: { ...state.election, status: "OPEN", openedAt: now() },
    activity: [activity("Election opened", "The local demo now accepts one synthetic cast attempt.", "teal"), ...state.activity],
  };
}

export function closeElection(state: DemoState): DemoState {
  if (!state.election || state.election.status !== "OPEN") return state;

  return {
    ...state,
    election: { ...state.election, status: "CLOSED", closedAt: now() },
    activity: [activity("Election closed", "No further local cast attempts can be accepted.", "amber"), ...state.activity],
  };
}

export function castDemoBallot(state: DemoState, requestId = "demo-request-001"): CastResult {
  if (!state.election || state.election.status !== "OPEN") {
    return { state, accepted: false, message: "The election is not open." };
  }

  if (state.receipt) {
    const nextState: DemoState = {
      ...state,
      duplicateAttempted: true,
      activity: [
        activity(
          "Duplicate rejected",
          `Request ${requestId} was refused because this local demo already has an accepted receipt.`,
          "rose",
        ),
        ...state.activity,
      ],
    };
    return {
      state: nextState,
      accepted: false,
      message: "Duplicate rejected: the demo keeps one accepted ballot record.",
    };
  }

  const receipt: Receipt = {
    id: "receipt-local-7c2d…91af",
    status: "ACCEPTED_PENDING_WITNESS",
    acceptedAt: now(),
    selectionStored: false,
  };

  return {
    state: {
      ...state,
      receipt,
      activity: [
        activity(
          "Ballot accepted locally",
          "An opaque demo receipt exists. External witness and tally proof are not connected.",
          "teal",
        ),
        ...state.activity,
      ],
    },
    accepted: true,
    message: "Accepted locally. Keep the receipt; independent witnessing is still pending.",
  };
}

export function runIntegrityReview(state: DemoState): DemoState {
  const hasElection = Boolean(state.election);
  const hasReceipt = Boolean(state.receipt);

  const checks: AuditCheck[] = [
    {
      label: "Lifecycle and accepted-record shape",
      status: hasElection && hasReceipt ? "OBSERVED" : "NOT_SUPPORTED",
      detail: hasElection && hasReceipt ? "The local state contains one accepted receipt after an OPEN transition." : "Create and open the demo before reviewing it.",
    },
    {
      label: "Duplicate attempt",
      status: state.duplicateAttempted ? "OBSERVED" : "NOT_SUPPORTED",
      detail: state.duplicateAttempted ? "A second local cast was rejected without adding another receipt." : "Run the duplicate attempt from the student view.",
    },
    {
      label: "Independent witness checkpoint",
      status: "NOT_CONNECTED",
      detail: "No witness service or external key is used by this browser-only demo.",
    },
    {
      label: "Encrypted tally proof",
      status: "NOT_SUPPORTED",
      detail: "This UI does not implement or claim a voting-engine tally proof.",
    },
  ];

  return {
    ...state,
    audit: { status: "INTEGRITY_ONLY", reviewedAt: now(), checks },
    activity: [
      activity("Integrity review recorded", "Local lifecycle and duplicate behavior were reviewed; no full election verification was performed.", "amber"),
      ...state.activity,
    ],
  };
}

export function resetDemo(): DemoState {
  return INITIAL_DEMO_STATE;
}
