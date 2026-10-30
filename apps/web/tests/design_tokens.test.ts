import { describe, expect, it } from "vitest";
import { DESIGN_TOKENS, getStateBadgeConfig } from "../src/lib/design_tokens";
import { ElectionState } from "../src/lib/types";

describe("HimVote Design Tokens and State Invariants", () => {
  it("matches design tokens exactly as defined in Section 8.1", () => {
    expect(DESIGN_TOKENS.navy900).toBe("#10233F");
    expect(DESIGN_TOKENS.teal600).toBe("#157E92");
    expect(DESIGN_TOKENS.green600).toBe("#15805D");
    expect(DESIGN_TOKENS.amber600).toBe("#AA6C0B");
    expect(DESIGN_TOKENS.red600).toBe("#C23C45");
    expect(DESIGN_TOKENS.surface).toBe("#F3F6FA");
    expect(DESIGN_TOKENS.white).toBe("#FFFFFF");
    expect(DESIGN_TOKENS.text).toBe("#17233B");
  });

  it("reserves green exclusively for cryptographically confirmed states", () => {
    const confirmedStates: ElectionState[] = [
      "WITNESSED",
      "ANCHOR_FINALIZED",
      "AUDIT_PASSED",
      "AUDITOR_ATTESTED",
    ];

    for (const state of confirmedStates) {
      const config = getStateBadgeConfig(state);
      expect(config.isConfirmed).toBe(true);
      expect(config.textColor).toContain("#15805D");
    }

    const unconfirmedStates: ElectionState[] = [
      "DRAFT",
      "FROZEN",
      "OPEN",
      "PENDING_WITNESS",
      "ANCHOR_PENDING",
      "FAILED",
      "DISPUTED",
    ];

    for (const state of unconfirmedStates) {
      const config = getStateBadgeConfig(state);
      expect(config.isConfirmed).toBe(false);
      expect(config.textColor).not.toContain("#15805D");
    }
  });

  it("assigns amber to pending and frozen states", () => {
    expect(getStateBadgeConfig("PENDING_WITNESS").textColor).toContain("#AA6C0B");
    expect(getStateBadgeConfig("ANCHOR_PENDING").textColor).toContain("#AA6C0B");
    expect(getStateBadgeConfig("FROZEN").textColor).toContain("#AA6C0B");
  });

  it("assigns red to failed and disputed states", () => {
    expect(getStateBadgeConfig("FAILED").textColor).toContain("#C23C45");
    expect(getStateBadgeConfig("DISPUTED").textColor).toContain("#C23C45");
  });

  it("assigns teal to open state", () => {
    expect(getStateBadgeConfig("OPEN").textColor).toContain("#157E92");
  });
});
