import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReceiptStatusResponse } from "../src/lib/types";
import {
  getReceiptStatusPresentation,
  ReceiptStatusBadge,
} from "../src/app/components/ReceiptStatusBadge";
import {
  getReceiptTimelineStages,
  ReceiptTimeline,
} from "../src/app/components/ReceiptTimeline";

const receipt = (status: ReceiptStatusResponse["status"]): ReceiptStatusResponse => ({
  status,
  handle: "HV_RECEIPT_WITH_A_LONG_OPAQUE_HANDLE_1234567890",
  leaf_index: 7,
  witnessed_at_utc: "2026-10-30T10:15:30Z",
  merkle_proof: ["sibling-digest"],
});

describe("student receipt status semantics", () => {
  it("does not describe a rejected submission as an accepted ballot", () => {
    const presentation = getReceiptStatusPresentation("REJECTED");

    expect(presentation.label).toBe("Submission rejected");
    expect(presentation.description).toContain("did not accept");
    expect(getReceiptTimelineStages(receipt("REJECTED"))).toEqual([
      expect.objectContaining({
        id: "rejected",
        title: "Submission rejected by casting service",
        state: "current",
      }),
    ]);
  });

  it("keeps unknown and anchor-reported states from implying independent verification", () => {
    const unknownMarkup = renderToString(
      React.createElement(ReceiptStatusBadge, { status: "UNKNOWN" }),
    );
    const anchorPresentation = getReceiptStatusPresentation("ANCHORED");

    expect(unknownMarkup).toContain('role="status"');
    expect(unknownMarkup).toContain("Status unknown");
    expect(anchorPresentation.label).toBe("Anchor reported by casting service");
    expect(anchorPresentation.description).toContain("does not independently verify chain finality");
  });

  it("marks the witness stage as the current stage while acceptance is pending", () => {
    const stages = getReceiptTimelineStages(receipt("COMMITTED_PENDING_WITNESS"));
    const markup = renderToString(
      React.createElement(ReceiptTimeline, { receipt: receipt("COMMITTED_PENDING_WITNESS") }),
    );

    expect(stages).toHaveLength(2);
    expect(stages[0]).toMatchObject({ id: "accepted", state: "complete" });
    expect(stages[1]).toMatchObject({ id: "witness", state: "current", statusLabel: "Pending" });
    expect(markup).toContain('aria-label="Receipt status timeline"');
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain("Do not describe this ballot as witnessed yet.");
  });

  it("does not expose a stale pending badge after witness or anchor reporting", () => {
    const witnessed = getReceiptTimelineStages(receipt("WITNESSED"));
    const anchored = getReceiptTimelineStages(receipt("ANCHORED"));

    expect(witnessed.at(-1)).toMatchObject({ id: "witness", state: "current", statusLabel: "Reported" });
    expect(anchored.at(-1)).toMatchObject({ id: "anchor", state: "current", statusLabel: "Reported" });
    expect(anchored.find((stage) => stage.id === "witness")).toMatchObject({ state: "complete" });
  });
});
