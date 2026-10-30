"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";
import { StateBadge } from "../../../../components/StateBadge";
import { Clock, ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { castingClient } from "@/lib/casting_client";
import type { ReceiptStatusResponse } from "@/lib/types";

export default function PendingAcceptancePage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const electionId = params?.id as string;
  const handle = searchParams?.get("handle") || "";
  const [receipt, setReceipt] = useState<ReceiptStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(handle));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!handle || !electionId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const nextReceipt = await castingClient.getReceiptStatus(electionId, handle);
        if (cancelled) return;
        setReceipt(nextReceipt);
        setError(null);
        setIsLoading(false);
        if (nextReceipt.status === "COMMITTED_PENDING_WITNESS") {
          timer = setTimeout(load, 8000);
        }
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Receipt status could not be retrieved.");
        setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [electionId, handle]);

  const statusState = receipt?.status === "WITNESSED" || receipt?.status === "ANCHORED"
    ? "WITNESSED"
    : receipt?.status === "REJECTED"
      ? "FAILED"
      : "PENDING_WITNESS";
  const heading = !handle
    ? "Submission status unknown"
    : error
      ? "Receipt status unavailable"
      : receipt?.status === "WITNESSED" || receipt?.status === "ANCHORED"
        ? "Ballot witnessed"
        : "Ballot accepted, witness pending";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-[#AA6C0B]/10 text-[#AA6C0B] flex items-center justify-center mx-auto shadow-sm">
          {error || !handle ? (
            <AlertTriangle className="w-8 h-8" aria-hidden="true" />
          ) : (
            <Clock className={`w-8 h-8 ${isLoading ? "animate-pulse" : ""}`} aria-hidden="true" />
          )}
        </div>
        <div className="flex justify-center">
          <StateBadge state={statusState} size="md" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10233F] dark:text-white">
          {heading}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {error || !handle
            ? "Do not submit a new ballot. Keep this page open or retrieve the receipt again when the casting service is available."
            : receipt?.status === "WITNESSED" || receipt?.status === "ANCHORED"
              ? "The receipt status came from the casting origin. Witnessed means the configured witness acknowledged the evidence; it does not establish independent operator control."
              : "The casting service accepted the encrypted ballot in its durable store. It is not independently witnessed yet."}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-5" aria-live="polite">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1E3352]">
          <span className="text-xs uppercase font-mono text-slate-500">Your Opaque Receipt Handle</span>
          {handle ? (
            <span className="font-mono font-bold text-sm text-[#157E92] bg-[#157E92]/10 px-3 py-1 rounded-md">
              {handle}
            </span>
          ) : (
            <span className="text-xs font-semibold text-[#C23C45]">Not available</span>
          )}
        </div>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${receipt ? "text-[#15805D]" : "text-slate-400"}`} aria-hidden="true" />
            <p>
              <strong>Database acceptance:</strong> {receipt ? "The casting service returned a durable receipt status." : "Waiting for an authenticated receipt response."}
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-[#AA6C0B] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <strong>Witness checkpoint:</strong> {receipt?.status === "WITNESSED" || receipt?.status === "ANCHORED" ? "The configured witness has acknowledged this evidence." : "The receipt remains pending until a witness acknowledgement is returned."}
            </p>
          </div>
        </div>

        {handle && (
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
        )}
      </div>
    </div>
  );
}
