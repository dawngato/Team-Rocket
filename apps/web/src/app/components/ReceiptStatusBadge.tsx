import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Link2,
} from "lucide-react";
import type { ReceiptStatusResponse } from "@/lib/types";

export type ReceiptUiStatus = ReceiptStatusResponse["status"] | "UNKNOWN";

export interface ReceiptStatusPresentation {
  label: string;
  description: string;
  tone: "pending" | "reported" | "warning" | "failed" | "unknown";
  icon: "clock" | "check" | "link" | "alert" | "help";
}

const PRESENTATIONS: Record<ReceiptUiStatus, ReceiptStatusPresentation> = {
  COMMITTED_PENDING_WITNESS: {
    label: "Accepted · witness pending",
    description:
      "The casting service reports durable acceptance. No witness acknowledgement has been returned yet.",
    tone: "pending",
    icon: "clock",
  },
  WITNESSED: {
    label: "Witnessed by configured service",
    description:
      "The casting service reports a witness acknowledgement. This page does not establish independent operator control.",
    tone: "reported",
    icon: "check",
  },
  ANCHORED: {
    label: "Anchor reported by casting service",
    description:
      "The casting service reports an anchor. This page does not independently verify chain finality.",
    tone: "warning",
    icon: "link",
  },
  REJECTED: {
    label: "Submission rejected",
    description:
      "The casting service did not accept this submission. Do not submit another ballot until the election desk confirms the next step.",
    tone: "failed",
    icon: "alert",
  },
  UNKNOWN: {
    label: "Status unknown",
    description:
      "No authenticated receipt status is available. Do not submit another ballot while the result is unresolved.",
    tone: "unknown",
    icon: "help",
  },
};

const TONE_CLASSES: Record<ReceiptStatusPresentation["tone"], string> = {
  pending:
    "border-[#AA6C0B]/35 bg-[#AA6C0B]/10 text-[#6B4707] dark:text-[#FCD34D]",
  reported:
    "border-[#157E92]/35 bg-[#157E92]/10 text-[#0E6273] dark:text-[#7DD3FC]",
  warning:
    "border-[#AA6C0B]/35 bg-[#AA6C0B]/10 text-[#6B4707] dark:text-[#FCD34D]",
  failed:
    "border-[#C23C45]/35 bg-[#C23C45]/10 text-[#8B2630] dark:text-[#FCA5A5]",
  unknown:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

const SIZE_CLASSES = {
  sm: "px-2 py-1 text-[11px] gap-1.5",
  md: "px-2.5 py-1.5 text-xs gap-2",
  lg: "px-3.5 py-2 text-sm gap-2",
} as const;

export function getReceiptStatusPresentation(
  status: ReceiptUiStatus,
): ReceiptStatusPresentation {
  return PRESENTATIONS[status];
}

export function ReceiptStatusBadge({
  status,
  size = "md",
}: {
  status: ReceiptUiStatus;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const presentation = getReceiptStatusPresentation(status);
  const Icon = {
    clock: Clock3,
    check: CheckCircle2,
    link: Link2,
    alert: AlertTriangle,
    help: HelpCircle,
  }[presentation.icon];

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-lg border font-semibold leading-tight ${TONE_CLASSES[presentation.tone]} ${SIZE_CLASSES[size]}`}
      role="status"
      aria-label={`${presentation.label}. ${presentation.description}`}
      data-receipt-status={status}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">{presentation.label}</span>
    </span>
  );
}
