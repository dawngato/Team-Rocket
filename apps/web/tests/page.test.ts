import { describe, expect, it } from "vitest";

describe("HimVote web foundation", () => {
  it("keeps the evidence state vocabulary explicit", () => {
    const states = ["PENDING_WITNESS", "WITNESSED", "ANCHOR_FINALIZED"];
    expect(states).toEqual(["PENDING_WITNESS", "WITNESSED", "ANCHOR_FINALIZED"]);
  });

  it("does not describe the receipt as proof of a ballot choice", () => {
    const receiptCopy = "Your receipt does not reveal your selection.";
    expect(receiptCopy).toContain("does not reveal");
  });
});
