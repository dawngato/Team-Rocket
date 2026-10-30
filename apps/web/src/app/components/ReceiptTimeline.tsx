import React from "react";
import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import type { ReceiptStatusResponse } from "@/lib/types";
import type { ReceiptUiStatus } from "./ReceiptStatusBadge";

type StageState = "complete" | "current";

export interface ReceiptTimelineStage {
  id: string;
  title: string;
  detail: string;
  status: ReceiptUiStatus;
  statusLabel: string;
  state: StageState;
  timestamp?: string;
}

function formatUtcTimestamp(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Timestamp not returned";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
}

export function getReceiptTimelineStages(
  receipt: ReceiptStatusResponse,
): ReceiptTimelineStage[] {
  if (receipt.status === "REJECTED") {
    return [
      {
        id: "rejected",
        title: "Submission rejected by casting service",
        detail:
          "This response does not represent an accepted ballot. Keep the receipt handle and contact the election desk before trying again.",
        status: "REJECTED",
        statusLabel: "Rejected",
        state: "current",
      },
    ];
  }

  const hasWitness = receipt.status === "WITNESSED" || receipt.status === "ANCHORED";
  const hasAnchor = receipt.status === "ANCHORED";

  const stages: ReceiptTimelineStage[] = [
    {
      id: "accepted",
      title: "Accepted by casting service",
      detail:
        "The casting origin reports a durable encrypted-ballot acceptance. This is not an independent witness or tally result.",
      status: "COMMITTED_PENDING_WITNESS",
      statusLabel: "Accepted",
      state: "complete",
    },
    {
      id: "witness",
      title: "Witness acknowledgement",
      detail: hasWitness
        ? "The casting origin reports that its configured witness acknowledged the evidence. Independent operator custody must still be checked separately."
        : "The receipt is waiting for a witness acknowledgement. Do not describe this ballot as witnessed yet.",
      status: hasWitness ? "WITNESSED" : "COMMITTED_PENDING_WITNESS",
      statusLabel: hasWitness ? "Reported" : "Pending",
      state: hasWitness && hasAnchor ? "complete" : "current",
      timestamp: formatUtcTimestamp(receipt.witnessed_at_utc),
    },
  ];

  if (hasAnchor) {
    stages.push({
      id: "anchor",
      title: "Chain anchor status",
      detail:
        "The casting origin reports an anchor for its checkpoint. This page does not independently verify the chain, contract, or finality depth.",
      status: "ANCHORED",
      statusLabel: "Reported",
      state: "current",
    });
  }

  return stages;
}

function StageMarker({ stage, index }: { stage: ReceiptTimelineStage; index: number }) {
  if (stage.status === "REJECTED") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#C23C45]/12 text-[#C23C45]" aria-hidden="true">
        <XCircle className="size-4" />
      </span>
    );
  }

  if (stage.state === "complete") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#157E92]/12 text-[#157E92]" aria-hidden="true">
        <CheckCircle2 className="size-4" />
      </span>
    );
  }

  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#AA6C0B]/45 bg-[#AA6C0B]/10 text-xs font-bold text-[#6B4707] dark:text-[#FCD34D]" aria-hidden="true">
      <CircleDashed className="size-4" />
      <span className="sr-only">Step {index + 1}</span>
    </span>
  );
}

export function ReceiptTimeline({ receipt }: { receipt: ReceiptStatusResponse }) {
  const stages = getReceiptTimelineStages(receipt);

  return (
    <ol className="flex flex-col gap-4" aria-label="Receipt status timeline">
      {stages.map((stage, index) => (
        <li
          key={stage.id}
          className={`rounded-xl border p-4 sm:p-5 ${
            stage.state === "current"
              ? "border-[#157E92]/50 bg-[#157E92]/[0.04] dark:bg-[#157E92]/10"
              : "border-slate-200 bg-white dark:border-[#1E3352] dark:bg-[#132135]"
          }`}
          aria-current={stage.state === "current" ? "step" : undefined}
          data-stage-state={stage.state}
        >
          <div className="flex min-w-0 items-start gap-3">
            <StageMarker stage={stage} index={index} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="min-w-0 break-words text-sm font-bold text-[#10233F] dark:text-white">
                  {stage.title}
                </h3>
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {stage.statusLabel}
                </span>
              </div>
              <p className="mt-2 break-words text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {stage.detail}
              </p>
              {stage.timestamp && (
                <time className="mt-2 block break-words font-mono text-[11px] text-slate-500 dark:text-slate-500">
                  {stage.timestamp}
                </time>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
