"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowRight, Copy, Download, Layers, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { castingClient } from "@/lib/casting_client";
import { electionClient } from "@/lib/election_client";
import type { ReceiptStatusResponse, Election } from "@/lib/types";
import { ReceiptStatusBadge } from "../../../components/ReceiptStatusBadge";
import { ReceiptTimeline } from "../../../components/ReceiptTimeline";
import { Breadcrumbs } from "@/components/Breadcrumbs";

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
  const initialElectionId = searchParams?.get("election_id") || "";

  const [electionId, setElectionId] = useState(initialElectionId);
  const [elections, setElections] = useState<Election[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "unavailable">("idle");
  const [receipt, setReceipt] = useState<ReceiptStatusResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(handle));
  const [error, setError] = useState<string | null>(null);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // If electionId is not in URL, attempt auto-resolution from session/local storage or active elections
  useEffect(() => {
    if (electionId || !handle) return;
    try {
      const sessionRaw = window.sessionStorage.getItem("himvote_session_receipts");
      if (sessionRaw) {
        const arr = JSON.parse(sessionRaw);
        const match = Array.isArray(arr) && arr.find((item) => item.handle === handle);
        if (match?.electionId) {
          setElectionId(match.electionId);
          return;
        }
      }
      const localRaw = window.localStorage.getItem("himvote_receipts");
      if (localRaw) {
        const arr = JSON.parse(localRaw);
        const match = Array.isArray(arr) && arr.find((item) => item.handle === handle);
        if (match?.electionId) {
          setElectionId(match.electionId);
          return;
        }
      }
    } catch {}

    // Fallback: fetch active elections to allow selection
    void electionClient.getElections().then((rows) => {
      setElections(rows);
      if (rows.length === 1 && rows[0]?.id) {
        setElectionId(rows[0].id);
      }
    }).catch(() => {});
  }, [handle, electionId]);

  useEffect(() => {
    if (!handle || !electionId) {
      setLoading(false);
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
        setError(cause instanceof Error ? cause.message : "Receipt status could not be retrieved from the casting gateway.");
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

  const handleDownload = () => {
    if (!handle) return;
    const data = {
      handle,
      electionId,
      receipt,
      downloadedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `himvote_receipt_${handle.substring(0, 12)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      electionId
  );

  const breadcrumbs = [
    { label: "Workspace", href: "/student" },
    { label: "Receipts", href: "/student/receipts" },
    { label: handle ? `Receipt ${handle.substring(0, 8)}…` : "Receipt Tracker" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="flex min-w-0 flex-col gap-5 border-b border-slate-200 pb-6 dark:border-[#1E3352] sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#15805D]/10 px-2.5 py-0.5 text-xs font-semibold text-[#15805D] dark:text-[#34D399]">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Opaque Voter Tracker
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
            Receipt Verification
          </h1>
          <p className="font-mono text-xs text-slate-500 break-all select-all">
            Handle: {handle || "Not provided"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={!handle}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            aria-label={handle ? "Copy receipt handle" : "Receipt handle unavailable"}
          >
            <Copy className="size-3.5" aria-hidden="true" />
            <span>{copyState === "copied" ? "Copied!" : "Copy Handle"}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!handle}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            title="Download JSON receipt tracker"
          >
            <Download className="size-3.5" aria-hidden="true" />
            <span>Download JSON</span>
          </button>
        </div>
      </header>

      {/* Missing Election Context Selector */}
      {!electionId && handle && (
        <section
          className="rounded-2xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 sm:p-6 space-y-3"
          role="status"
        >
          <h2 className="text-sm font-bold text-[#6B4707] dark:text-[#FCD34D]">
            Select Election Context for this Tracker
          </h2>
          <p className="text-xs text-[#6B4707] dark:text-[#FCD34D] leading-relaxed">
            The receipt handle belongs to a specific election contest. Please select the contest to verify its witness signatures and Merkle inclusion proof:
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {elections.map((elec) => (
              <button
                key={elec.id}
                type="button"
                onClick={() => setElectionId(elec.id)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white dark:bg-[#132135] border border-slate-300 dark:border-[#1E3352] px-3 py-1.5 text-xs font-bold text-[#10233F] dark:text-white hover:border-[#157E92] shadow-2xs"
              >
                <span>{elec.title}</span>
                <ArrowRight className="size-3 text-slate-400" />
              </button>
            ))}
            {elections.length === 0 && (
              <Link
                href="/student/receipts"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#157E92] px-3.5 py-1.5 text-xs font-bold text-white"
              >
                Enter Election ID manually →
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Receipt Timeline & Status Card */}
      <section
        className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] sm:p-8"
        aria-labelledby="receipt-progress-heading"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 id="receipt-progress-heading" className="text-lg sm:text-xl font-bold text-[#10233F] dark:text-white">
              Authoritative Receipt Lifecycle
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Each stage is cryptographically discrete. A casting-service response is not the same as a multi-party witnessed record or an on-chain anchored checkpoint.
            </p>
          </div>
          <div aria-live="polite" aria-busy={loading}>
            <ReceiptStatusBadge status={receipt?.status ?? "UNKNOWN"} size="md" />
          </div>
        </div>

        {loading && (
          <div
            className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-[#1E3352] dark:bg-slate-900/40 dark:text-slate-300"
            role="status"
          >
            <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-[#157E92]" />
            Loading receipt status from the casting gateway…
          </div>
        )}

        {error && (
          <div
            className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm leading-relaxed text-[#8B2630] dark:text-[#FCA5A5]"
            role="alert"
          >
            {error} Do not submit another ballot while the status is unresolved.
          </div>
        )}

        {!loading && !error && receipt && <ReceiptTimeline receipt={receipt} />}

        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 dark:border-[#1E3352] dark:bg-slate-900/40 dark:text-slate-400">
          <Lock className="mt-0.5 size-4.5 shrink-0 text-[#157E92]" aria-hidden="true" />
          <p>
            <strong>Privacy Guarantee:</strong> The opaque tracker contains only cryptographic hash commitments. It does not reveal your selected candidate or allow anyone to coerce your choice.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-100 pt-3 dark:border-[#1E3352]">
          {hasInclusionProof ? (
            <Link
              href={`/student/receipts/${encodeURIComponent(handle)}/inclusion?election_id=${encodeURIComponent(electionId)}`}
              className="inline-flex min-h-12 w-full flex-1 items-center justify-center gap-2 rounded-xl bg-[#157E92] hover:bg-[#0E6273] active:scale-[0.98] px-5 py-3 text-sm font-bold text-white shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92]"
            >
              <Layers className="size-4" aria-hidden="true" />
              <span>Verify Cryptographic Merkle Inclusion</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <div className="inline-flex min-h-12 w-full flex-1 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
              Inclusion proof will activate once the periodic witness checkpoint seals the batch.
            </div>
          )}
          <Link
            href="/student/results"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] px-5 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors sm:w-auto"
          >
            View Election Results
          </Link>
        </div>
      </section>
    </main>
  );
}
