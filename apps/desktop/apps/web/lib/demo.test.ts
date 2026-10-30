import { describe, expect, it } from "vitest";
import {
  INITIAL_DEMO_STATE,
  castDemoBallot,
  closeElection,
  createDraft,
  openElection,
  runIntegrityReview,
} from "./demo";

describe("local SecureVote demo adapter", () => {
  it("walks through draft, open, one local acceptance, and close", () => {
    const draft = createDraft(INITIAL_DEMO_STATE);
    const open = openElection(draft);
    const accepted = castDemoBallot(open);
    const closed = closeElection(accepted.state);

    expect(draft.election?.status).toBe("DRAFT");
    expect(open.election?.status).toBe("OPEN");
    expect(accepted.accepted).toBe(true);
    expect(accepted.state.receipt?.status).toBe("ACCEPTED_PENDING_WITNESS");
    expect(closed.election?.status).toBe("CLOSED");
  });

  it("rejects a second local cast without creating a second receipt", () => {
    const open = openElection(createDraft(INITIAL_DEMO_STATE));
    const first = castDemoBallot(open, "first");
    const second = castDemoBallot(first.state, "retry");

    expect(second.accepted).toBe(false);
    expect(second.state.duplicateAttempted).toBe(true);
    expect(second.state.receipt?.id).toBe(first.state.receipt?.id);
    expect(second.state.activity[0]?.label).toBe("Duplicate rejected");
  });

  it("keeps the review integrity-only and marks missing proof boundaries", () => {
    const open = openElection(createDraft(INITIAL_DEMO_STATE));
    const accepted = castDemoBallot(open).state;
    const reviewed = runIntegrityReview(accepted);

    expect(reviewed.audit.status).toBe("INTEGRITY_ONLY");
    expect(reviewed.audit.checks.find((check) => check.label === "Encrypted tally proof")?.status).toBe("NOT_SUPPORTED");
    expect(reviewed.audit.checks.find((check) => check.label === "Independent witness checkpoint")?.status).toBe("NOT_CONNECTED");
  });
});
