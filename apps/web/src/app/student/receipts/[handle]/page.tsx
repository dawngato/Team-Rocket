"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { StateBadge } from "../../../../components/StateBadge";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Lock,
  Copy,
  ArrowRight,
  Layers,
} from "lucide-react";
import { castingClient } from "@/lib/casting_client";
import type { ElectionState, ReceiptStatusResponse } from "@/lib/types";

export default function MyReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawHandle = (params?.handle as string) || "";
  const electionId = searchParams?.get("election_id") || "";
  const handleFormatted = rawHandle ? decodeURIComponent(rawHandle) : "Unavailable";

  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptStatusResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(rawHandle && electionId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rawHandle || !electionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const nextReceipt = await castingClient.getReceiptStatus(electionId, decodeURIComponent(rawHandle));
        if (cancelled) return;
        setReceipt(nextReceipt);
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Receipt status could not be retrieved.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [electionId, rawHandle]);

  const stages: Array<{
    title: string;
    state: ElectionState;
    detail: string;
    timestamp: string;
  }> = receipt
    ? [
        {
          title: "Accepted by casting service",
          state: "PENDING_WITNESS",
          detail: "The casting origin returned a durable acceptance receipt. This status is not an independent witness or tally result.",
          timestamp: receipt.witnessed_at_utc || "Timestamp not returned",
        },
        ...(receipt.status === "WITNESSED" || receipt.status === "ANCHORED"
          ? [{
              title: "Witness acknowledgement returned",
              state: "WITNESSED" as ElectionState,
              detail: "The casting origin reports a witness acknowledgement. Operator independence must still be checked against separately pinned witness evidence.",
              timestamp: receipt.witnessed_at_utc || "Timestamp not returned",
            }]
          : []),
        ...(receipt.status === "ANCHORED"
          ? [{
              title: "Anchor status returned",
              state: "ANCHOR_FINALIZED" as ElectionState,
              detail: "The casting origin reports an anchored state. This UI does not independently verify chain finality.",
              timestamp: "Timestamp not returned",
            }]
          : []),
      ]
    : [];
  const activeStage = Math.max(stages.length - 1, 0);

  const handleCopy = () => {
    if (!rawHandle) return;
    navigator.clipboard.writeText(decodeURIComponent(rawHandle));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Development Evidence Receipt
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Voter Evidence Receipt
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Track only the status returned by the casting origin. Independent witness custody and native tally verification are not established by this page.
          </p>
        </div>

        {/* Copy Receipt Handle */}
        <div className="flex items-center gap-2 bg-white dark:bg-[#132135] p-2 rounded-xl border border-slate-200 dark:border-[#1E3352] shadow-sm">
          <span className="font-mono font-bold text-sm text-[#10233F] dark:text-white px-2">
            {handleFormatted}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Copy receipt handle"
          >
            <Copy className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {copied && (
        <div className="p-3 bg-[#15805D]/10 border border-[#15805D]/30 text-[#15805D] text-xs font-semibold rounded-lg text-center animate-fadeIn">
          Receipt handle copied to clipboard
        </div>
      )}

      {/* Evidence Timeline */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm space-y-8">
        <div>
          <h2 className="text-xl font-bold text-[#10233F] dark:text-white">
            Checkpoint Progression Timeline
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            A green indicator means the configured service returned that state; it is not a claim of independent production finality.
          </p>
        </div>

        {loading && (
          <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="status">
            Loading receipt status from the casting origin…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
            {error} Do not submit another ballot while the status is unresolved.
          </div>
        )}

        {!loading && !error && !electionId && (
          <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="status">
            The election context is missing from this receipt link. Retrieve the receipt from the original submission page before attempting inclusion verification.
          </div>
        )}

        {!loading && !error && electionId && !receipt && (
          <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50 dark:bg-slate-900/30 p-4 text-sm text-slate-600 dark:text-slate-300" role="status">
            No authenticated receipt status has been returned yet.
          </div>
        )}

        {stages.length > 0 && <div className="space-y-6">
          {stages.map((stage, idx) => {
            const isCompleted = idx <= activeStage;
            const isCurrent = idx === activeStage;

            return (
              <div
                key={stage.title}
                className={`p-5 rounded-xl border transition-all ${
                  isCurrent
                    ? "border-[#157E92] bg-[#157E92]/5 dark:bg-[#157E92]/15 shadow-sm"
                    : isCompleted
                    ? "border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135]"
                    : "border-slate-100 dark:border-slate-800/60 opacity-60 bg-slate-50/50 dark:bg-slate-900/20"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        isCompleted
                          ? "bg-[#15805D] text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <h3 className="font-bold text-base text-[#10233F] dark:text-white">
                      {stage.title}
                    </h3>
                  </div>
                  <StateBadge state={stage.state} size="sm" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-10 leading-relaxed">
                  {stage.detail}
                </p>
                <div className="text-[11px] font-mono text-slate-400 pl-10 pt-2">
                  Timestamp: {stage.timestamp}
                </div>
              </div>
            );
          })}
        </div>}

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-[#1E3352] flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <Lock className="w-5 h-5 text-[#157E92] flex-shrink-0" aria-hidden="true" />
          <p>
            <strong>Privacy boundary:</strong> The opaque receipt does not reveal your selection. A status response alone does not prove ballot inclusion, cast as intended, secrecy, or tally correctness.
          </p>
        </div>

        {/* Call to Action to Verify Merkle Inclusion */}
        <div className="pt-2 flex flex-col sm:flex-row gap-4">
          {receipt?.merkle_proof?.length ? (
            <Link
              href={`/student/receipts/${encodeURIComponent(rawHandle)}/inclusion?election_id=${encodeURIComponent(electionId)}`}
              className="flex-1 min-h-[44px] px-6 py-3 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
            >
              <Layers className="w-4 h-4" aria-hidden="true" />
              <span>Verify Merkle Tree Inclusion Proof</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className="flex-1 min-h-[44px] px-6 py-3 font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center gap-2 text-sm text-center">
              Inclusion proof is not available from this receipt response
            </span>
          )}
          <Link
            href="/student/results"
            className="min-h-[44px] px-6 py-3 font-bold text-[#10233F] dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <span>View Election Results</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
