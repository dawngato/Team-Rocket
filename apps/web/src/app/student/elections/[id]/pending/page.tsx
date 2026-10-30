"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";
import { StateBadge } from "../../../../components/StateBadge";
import { Clock, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export default function PendingAcceptancePage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const electionId = params?.id as string;
  const handle = searchParams?.get("handle") || "HV_24F8_19C2";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-[#AA6C0B]/10 text-[#AA6C0B] flex items-center justify-center mx-auto shadow-sm">
          <Clock className="w-8 h-8 animate-pulse" aria-hidden="true" />
        </div>
        <div className="flex justify-center">
          <StateBadge state="PENDING_WITNESS" size="md" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10233F] dark:text-white">
          Ballot Committed to Ledger
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          The casting service committed your encrypted ballot to the append only outbox. Your submission is awaiting the next witness checkpoint cycle.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1E3352]">
          <span className="text-xs uppercase font-mono text-slate-500">Your Opaque Receipt Handle</span>
          <span className="font-mono font-bold text-sm text-[#157E92] bg-[#157E92]/10 px-3 py-1 rounded-md">
            {handle}
          </span>
        </div>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#15805D] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <strong>Single spend nullifier locked:</strong> Double submission attempts with this credential will be rejected.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-[#AA6C0B] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <strong>Batch witness signing:</strong> Independent witness nodes cosign checkpoints periodically. As soon as the batch is processed, your status upgrades to WITNESSED.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352]">
          <Link
            href={`/student/receipts/${encodeURIComponent(handle)}`}
            className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>Open Receipt and Witness Timeline</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
