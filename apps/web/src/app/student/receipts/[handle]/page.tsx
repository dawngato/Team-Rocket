"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowRight, Copy, Layers, Lock, ShieldCheck } from "lucide-react";
import { castingClient } from "@/lib/casting_client";
import type { ReceiptStatusResponse } from "@/lib/types";
import { ReceiptStatusBadge } from "../../../components/ReceiptStatusBadge";
import { ReceiptTimeline } from "../../../components/ReceiptTimeline";

function decodeHandle(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function MyReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawHandle = typeof params?.handle === "string" ? params.handle : "";
  const handle = rawHandle ? decodeHandle(rawHandle) : "";
  const electionId = searchParams?.get("election_id") || "";

  const [copyState, setCopyState] = useState<"idle" | "copied" | "unavailable">("idle");
  const [receipt, setReceipt] = useState<ReceiptStatusResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(handle && electionId));
  const [error, setError] = useState<string | null>(null);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!handle || !electionId) {
      setLoading(false);
      setReceipt(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setReceipt(null);
    setError(null);

    const load = async () => {
      try {
        const nextReceipt = await castingClient.getReceiptStatus(electionId, handle);
        if (cancelled) return;
        setReceipt(nextReceipt);
      } catch (cause) {
        if (cancelled) return;
        setReceipt(null);
        setError(cause instanceof Error ? cause.message : "Receipt status could not be retrieved.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [electionId, handle]);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!handle) return;

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(handle);
      setCopyState("copied");
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("unavailable");
    }
  };

  const hasInclusionProof = Boolean(
    receipt &&
      receipt.status !== "REJECTED" &&
      typeof receipt.tree_size === "number" &&
      Number.isSafeInteger(receipt.tree_size) &&
      receipt.tree_size > 0 &&
      typeof receipt.leaf_hash === "string" &&
      typeof receipt.merkle_root === "string" &&
      Array.isArray(receipt.merkle_proof) &&
      electionId,
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex min-w-0 flex-col gap-5 border-b border-slate-200 pb-6 dark:border-[#1E3352] sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded bg-[#157E92]/10 px-2.5 py-1 text-xs font-semibold text-[#0E6273] dark:text-[#7DD3FC]">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Development evidence receipt</span>
          </div>
          <h1 className="text-balance text-2xl font-bold tracking-tight text-[#10233F] dark:text-white sm:text-3xl">
            Voter evidence receipt
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            This page displays only the status returned by the casting origin. It does not independently verify witness custody, chain finality, ballot intent, or the final tally.
          </p>
        </div>

        <div className="flex min-w-0 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] sm:w-auto sm:max-w-[18rem]">
          <code className="min-w-0 flex-1 break-all px-2 text-sm font-bold text-[#10233F] dark:text-white">
            {handle || "Unavailable"}
          </code>
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={!handle}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={handle ? "Copy receipt handle" : "Receipt handle unavailable"}
          >
            <Copy className="size-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {copyState !== "idle" && (
        <div
          className={`rounded-lg border p-3 text-center text-xs font-semibold ${
            copyState === "copied"
              ? "border-[#157E92]/30 bg-[#157E92]/10 text-[#0E6273] dark:text-[#7DD3FC]"
              : "border-[#AA6C0B]/30 bg-[#AA6C0B]/10 text-[#6B4707] dark:text-[#FCD34D]"
          }`}
          role="status"
          aria-live="polite"
        >
          {copyState === "copied"
            ? "Receipt handle copied. Keep it private."
            : "Copy is unavailable in this browser. Select the handle manually instead."}
        </div>
      )}

      <section className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] sm:p-8" aria-labelledby="receipt-progress-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 id="receipt-progress-heading" className="text-xl font-bold text-[#10233F] dark:text-white">
              Receipt status timeline
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Each stage is separate. A casting-service response is not the same as a witnessed record or an independently audited result.
            </p>
          </div>
          <div aria-live="polite" aria-busy={loading}>
            <ReceiptStatusBadge status={receipt?.status ?? "UNKNOWN"} size="md" />
          </div>
        </div>

        {loading && (
          <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="status">
            Loading receipt status from the casting origin…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm leading-relaxed text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
            {error} Do not submit another ballot while the status is unresolved.
          </div>
        )}

        {!loading && !error && !handle && (
          <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm leading-relaxed text-[#6B4707] dark:text-[#FCD34D]" role="status">
            The receipt handle is missing from this link. Return to the original submission page and open its receipt link.
          </div>
        )}

        {!loading && !error && handle && !electionId && (
          <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm leading-relaxed text-[#6B4707] dark:text-[#FCD34D]" role="status">
            The election context is missing from this receipt link. Retrieve the receipt from the original submission page before attempting inclusion verification.
          </div>
        )}

        {!loading && !error && receipt && <ReceiptTimeline receipt={receipt} />}

        {!loading && !error && handle && electionId && !receipt && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:border-[#1E3352] dark:bg-slate-900/30 dark:text-slate-300" role="status">
            No authenticated receipt status has been returned yet. Do not submit another ballot while the result is unresolved.
          </div>
        )}

        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 dark:border-[#1E3352] dark:bg-slate-900/40 dark:text-slate-400">
          <Lock className="mt-0.5 size-5 shrink-0 text-[#157E92]" aria-hidden="true" />
          <p>
            <strong>Privacy boundary:</strong> The opaque receipt does not reveal your selection. A status response alone does not prove ballot inclusion, cast as intended, secrecy, or tally correctness.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-2 dark:border-[#1E3352] sm:flex-row">
          {hasInclusionProof ? (
            <Link
              href={`/student/receipts/${encodeURIComponent(handle)}/inclusion?election_id=${encodeURIComponent(electionId)}`}
              className="inline-flex min-h-11 w-full flex-1 items-center justify-center gap-2 rounded-lg bg-[#157E92] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0E6273] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
            >
              <Layers className="size-4" aria-hidden="true" />
              <span>Verify inclusion proof</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className="inline-flex min-h-11 w-full flex-1 items-center justify-center rounded-lg bg-slate-100 px-5 py-3 text-center text-sm font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Inclusion proof is not available from this receipt response
            </span>
          )}
          <Link
            href="/student/results"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-100 px-5 py-3 text-sm font-bold text-[#10233F] transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 sm:w-auto"
          >
            View election results
          </Link>
        </div>
      </section>
    </main>
  );
}
