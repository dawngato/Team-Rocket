"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";
import { Clock, ShieldCheck, ArrowRight, AlertTriangle, RefreshCw } from "lucide-react";
import { castingClient } from "@/lib/casting_client";
import type { ReceiptStatusResponse } from "@/lib/types";
import { ReceiptStatusBadge } from "../../../../components/ReceiptStatusBadge";
import { ReceiptTimeline } from "../../../../components/ReceiptTimeline";

export default function PendingAcceptancePage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const electionId = params?.id as string;
  const handle = searchParams?.get("handle") || "";
  const [receipt, setReceipt] = useState<ReceiptStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(handle));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!handle || !electionId) {
      setIsLoading(false);
      setIsRefreshing(false);
      setReceipt(null);
      setError(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setIsLoading(true);
    setError(null);

    const load = async (initialLoad: boolean) => {
      if (initialLoad) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const nextReceipt = await castingClient.getReceiptStatus(electionId, handle);
        if (cancelled) return;
        setReceipt(nextReceipt);
        setError(null);
        if (nextReceipt.status === "COMMITTED_PENDING_WITNESS") {
          timer = setTimeout(() => void load(false), 8000);
        }
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Receipt status could not be retrieved.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void load(true);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [electionId, handle, retryCount]);

  const heading = !handle
    ? "Submission status unknown"
    : error
      ? "Receipt status unavailable"
      : receipt?.status === "REJECTED"
        ? "Ballot submission rejected"
      : receipt?.status === "WITNESSED" || receipt?.status === "ANCHORED"
        ? "Receipt status reported"
        : receipt
          ? "Ballot accepted, witness pending"
          : "Receipt status pending";

  const description = !handle
    ? "No receipt handle was supplied. Retrieve the receipt from the original submission page instead of submitting another ballot."
    : error
      ? "The casting service could not be reached. Do not submit a new ballot while the result is unresolved. Retry this status check when the service is available."
      : receipt?.status === "REJECTED"
        ? "The casting service rejected this submission. Keep the receipt handle and contact the election desk before trying again."
        : receipt?.status === "WITNESSED" || receipt?.status === "ANCHORED"
          ? "The casting service reports a witness acknowledgement. This page does not establish independent operator control or chain finality."
          : receipt
            ? "The casting service accepted the encrypted ballot in its durable store. It is not independently witnessed yet."
            : "No authenticated receipt response has been returned yet. Do not submit another ballot while the result is unresolved.";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[#AA6C0B]/10 text-[#AA6C0B] shadow-sm">
          {error || !handle ? (
            <AlertTriangle className="size-8" aria-hidden="true" />
          ) : (
            <Clock className={`size-8 ${isLoading || isRefreshing ? "animate-pulse" : ""}`} aria-hidden="true" />
          )}
        </div>
        <div aria-live="polite" aria-busy={isLoading || isRefreshing}>
          <ReceiptStatusBadge status={receipt?.status ?? "UNKNOWN"} size="md" />
        </div>
        <h1 className="text-balance text-2xl font-extrabold text-[#10233F] dark:text-white sm:text-3xl">
          {heading}
        </h1>
        <p className="mx-auto max-w-md text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>

      <section className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] sm:p-6" aria-labelledby="pending-receipt-heading">
        <h2 id="pending-receipt-heading" className="sr-only">Receipt status details</h2>
        <div className="flex min-w-0 flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E3352]">
          <span className="text-xs uppercase tracking-wide text-slate-500">Your opaque receipt handle</span>
          {handle ? (
            <code className="max-w-full break-all rounded-md bg-[#157E92]/10 px-3 py-1 text-sm font-bold text-[#157E92]">
              {handle}
            </code>
          ) : (
            <span className="text-xs font-semibold text-[#C23C45]">Not available</span>
          )}
        </div>

        <div className="flex flex-col gap-3 text-xs text-slate-600 dark:text-slate-400" aria-live="polite">
          {receipt ? (
            <ReceiptTimeline receipt={receipt} />
          ) : (
            <div className="rounded-lg border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 leading-relaxed text-[#6B4707] dark:text-[#FCD34D]" role="status">
              {isLoading || isRefreshing ? "Checking the casting service for the latest receipt status…" : "No authenticated receipt status is available yet."}
            </div>
          )}
        </div>

        {error && handle && electionId && (
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            disabled={isRefreshing}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#157E92]/35 px-4 py-2 text-sm font-bold text-[#0E6273] transition-colors hover:bg-[#157E92]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] disabled:cursor-wait disabled:opacity-60 dark:text-[#7DD3FC]"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>{isRefreshing ? "Retrying status check…" : "Retry status check"}</span>
          </button>
        )}

        {handle && (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-[#1E3352] sm:flex-row">
            <Link
              href={`/student/receipts/${encodeURIComponent(handle)}?election_id=${encodeURIComponent(electionId)}`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#157E92] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0E6273] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
            >
              <ShieldCheck className="size-4" aria-hidden="true" />
              <span>Open receipt timeline</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
