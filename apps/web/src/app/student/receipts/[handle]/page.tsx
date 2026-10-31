"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Binary,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  GitBranch,
  Hash,
  Info,
  Layers,
  Lock,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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

  // Auto-resolve election ID if missing from URL
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

    void electionClient
      .getElections()
      .then((rows) => {
        setElections(rows);
        if (rows.length === 1 && rows[0]?.id) {
          setElectionId(rows[0].id);
        }
      })
      .catch(() => {});
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
        setError(
          cause instanceof Error
            ? cause.message
            : "Receipt status could not be retrieved from the configured casting service.",
        );
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
    const receiptExport = {
      artifact_type: "himvote_receipt_status_export",
      schema_version: "2.0",
      handle,
      election_id: electionId || "unspecified",
      status: receipt?.status || "NOT_LOADED",
      timestamp_witnessed_utc: receipt?.witnessed_at_utc || null,
      leaf_hash: receipt?.leaf_hash || null,
      merkle_root: receipt?.merkle_root || null,
      tree_size: receipt?.tree_size ?? null,
      leaf_index: receipt?.leaf_index ?? null,
      merkle_proof: receipt?.merkle_proof || null,
      client_download_timestamp_utc: new Date().toISOString(),
      data_source_notice:
        "This export contains fields returned by the configured casting service. It is not a signed artifact and does not independently verify the receipt, Merkle path, witness, blockchain transaction, or tally.",
    };
    const blob = new Blob([JSON.stringify(receiptExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `himvote_ballot_receipt_${handle.substring(0, 14)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasProofFields = Boolean(
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

  const breadcrumbs = [
    { label: "Workspace", href: "/student" },
    { label: "Ballot Receipts", href: "/student/receipts" },
    { label: handle ? `Receipt ${handle.substring(0, 8)}…` : "Receipt Tracker" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1850px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      <Breadcrumbs items={breadcrumbs} />

      {/* Header Banner */}
      <header className="flex min-w-0 flex-col gap-5 border-b border-slate-200 pb-7 dark:border-[#1E3352] xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            <span>Receipt status returned by the casting service</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white sm:text-4xl">
            Receipt Status and Evidence
          </h1>
          <p className="font-mono text-xs text-slate-500 break-all select-all">
            Handle: <code className="font-bold text-slate-700 dark:text-slate-300">{handle || "Not provided"}</code>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => void handleCopy()}
            disabled={!handle}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-200 dark:hover:bg-slate-800 transition"
            aria-label={handle ? "Copy receipt handle" : "Receipt handle unavailable"}
          >
            {copyState === "copied" ? (
              <>
                <Check className="size-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copy Handle</span>
              </>
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleDownload}
            disabled={!handle}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#157E92] hover:bg-[#0E6273] px-4 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92]"
            title="Download the receipt fields returned by the service"
          >
            <Download className="size-3.5" aria-hidden="true" />
            <span>Download Receipt Data</span>
          </motion.button>
        </div>
      </header>

      {/* Missing Election Context Selector */}
      {!electionId && handle && (
        <section
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 space-y-3"
          role="status"
        >
          <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <Info className="size-4" />
            <span>Select Election Contest for This Ballot Receipt</span>
          </h2>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            A receipt lookup requires its election ID. Select an election returned by the service or enter the ID manually. This page does not verify witness signatures or blockchain inclusion.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {elections.map((elec) => (
              <motion.button
                whileTap={{ scale: 0.98 }}
                key={elec.id}
                type="button"
                onClick={() => setElectionId(elec.id)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white border border-slate-300 px-4 py-2 text-xs font-bold text-[#10233F] hover:border-[#157E92] shadow-2xs dark:bg-[#132135] dark:border-[#1E3352] dark:text-white"
              >
                <span>{elec.title}</span>
                <ArrowRight className="size-3 text-slate-400" />
              </motion.button>
            ))}
            {elections.length === 0 && (
              <Link
                href="/student/receipts"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#157E92] px-4 py-2 text-xs font-bold text-white"
              >
                Enter Election ID Manually →
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Fluid Grid Layout: Left Column (Lifecycle Timeline & Merkle Proof) + Right Column (Cryptographic Inspection & Security) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Authoritative Lifecycle & Merkle Tracker (7 Cols on Widescreen) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Authoritative Receipt Lifecycle */}
          <section
            className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-[#1E3352] dark:bg-[#132135]"
            aria-labelledby="receipt-progress-heading"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="min-w-0">
                <h2
                  id="receipt-progress-heading"
                  className="text-xl font-bold text-[#10233F] dark:text-white"
                >
                  Receipt Status Timeline
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Status stages are reported by the configured casting service. This timeline does not independently verify service operations or blockchain finality.
                </p>
              </div>
              <div aria-live="polite" aria-busy={loading}>
                <ReceiptStatusBadge status={receipt?.status ?? "UNKNOWN"} size="md" />
              </div>
            </div>

            {loading && (
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600 dark:border-[#1E3352] dark:bg-slate-900/40 dark:text-slate-300"
                role="status"
              >
                <RefreshCw className="size-6 animate-spin text-[#157E92]" />
                <span>Loading receipt status from the configured casting service…</span>
              </div>
            )}

            {error && (
              <div
                className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm leading-relaxed text-[#8B2630] dark:text-[#FCA5A5]"
                role="alert"
              >
                {error} Do not submit another ballot while the current receipt status is being confirmed.
              </div>
            )}

            {!loading && !error && receipt && <ReceiptTimeline receipt={receipt} />}
          </section>

          {/* Interactive Merkle Inclusion Proof Status Tracker */}
          <section
            className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-[#1E3352] dark:bg-[#132135]"
            aria-labelledby="merkle-tracker-heading"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-[#157E92] dark:text-[#38BDF8]" />
                  <h3
                    id="merkle-tracker-heading"
                    className="text-lg font-bold text-[#10233F] dark:text-white"
                  >
                  Merkle Inclusion Data
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Receipt fields returned by the service. Use the separate path checker to calculate whether the supplied path matches the supplied root.
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  hasProofFields
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-800 dark:text-amber-300"
                }`}
              >
                {hasProofFields ? "Proof Data Returned" : "No Proof Data"}
              </span>
            </div>

            {/* Merkle Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                <span className="block font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Tree Size
                </span>
                <strong className="mt-1 block text-base font-extrabold text-[#10233F] dark:text-white">
                  {typeof receipt?.tree_size === "number" ? `${receipt.tree_size} reported leaves` : "Not provided"}
                </strong>
                <span className="mt-1 block text-[11px] text-slate-500">
                  Total committed ballots
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                <span className="block font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Proof Path Length
                </span>
                <strong className="mt-1 block text-base font-extrabold text-[#10233F] dark:text-white">
                  {Array.isArray(receipt?.merkle_proof) ? `${receipt.merkle_proof.length} hashes returned` : "Not provided"}
                </strong>
                <span className="mt-1 block text-[11px] text-slate-500">
                  Log2(N) sibling elements
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                <span className="block font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Verification Status
                </span>
                <strong className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  <span>Not run on this page</span>
                </strong>
                <span className="mt-1 block text-[11px] text-slate-500">
                  Check the supplied path separately
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              {hasProofFields ? (
                <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                  <Link
                    href={`/student/receipts/${encodeURIComponent(handle)}/inclusion?election_id=${encodeURIComponent(electionId)}`}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#157E92] hover:bg-[#0E6273] px-5 py-3 text-sm font-bold text-white shadow-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92]"
                  >
                    <Layers className="size-4" aria-hidden="true" />
                  <span>Check the supplied Merkle path</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </motion.div>
              ) : (
                <div className="inline-flex min-h-12 w-full flex-1 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/80 px-5 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                  The service has not returned complete Merkle inclusion fields for this receipt.
                </div>
              )}
              <Link
                href="/student/results"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] px-5 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition sm:w-auto"
              >
                View Election Results
              </Link>
            </div>
          </section>
        </div>

        {/* Right Column: Cryptographic Anatomy & Privacy Guarantees (5 Cols on Widescreen) */}
        <aside className="lg:col-span-5 flex flex-col gap-6">
          {/* Identity Separation Invariant */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs dark:border-[#1E3352] dark:bg-[#132135] space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#157E92] dark:text-[#38BDF8]">
              <LockKeyhole className="size-4" />
              <span>Privacy properties not verified here</span>
            </div>
            <h3 className="text-base font-bold text-[#10233F] dark:text-white">
              Receipt Data Scope
            </h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              The configured casting service returns a receipt handle and status fields. This interface does not establish whether service logs or other records can link the handle to an identity or candidate selection.
            </p>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <strong className="block font-bold">Independent review required</strong>
              <p className="leading-relaxed opacity-95">
                Review the deployed data flows, logs, and key handling before relying on privacy claims.
              </p>
            </div>
          </section>

          {/* Cryptographic Artifact Details */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 dark:border-[#1E3352] dark:bg-slate-900/40 space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Binary className="size-4 text-[#157E92]" />
              <span>Merkle Data Returned by Service</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Leaf hash
                </span>
                <code className="mt-0.5 block rounded-lg bg-white p-2 font-mono text-[11px] text-slate-700 break-all border border-slate-200 dark:bg-[#132135] dark:border-slate-800 dark:text-slate-300">
                  {receipt?.leaf_hash || "Not provided"}
                </code>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Merkle root
                </span>
                <code className="mt-0.5 block rounded-lg bg-white p-2 font-mono text-[11px] text-slate-700 break-all border border-slate-200 dark:bg-[#132135] dark:border-slate-800 dark:text-slate-300">
                  {receipt?.merkle_root || "Not provided"}
                </code>
              </div>
            </div>
          </section>

          {/* Download Artifact Notice */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-[#1E3352] dark:bg-[#132135] space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <FileCheck2 className="size-4 text-[#157E92]" />
              <span>Downloadable Verification Artifact</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export the fields currently returned by the casting service. The file is not signed, and no standalone `himvote verify` command is included with this interface.
            </p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleDownload}
              disabled={!handle}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition"
            >
              <Download className="size-3.5" />
              <span>Download Receipt Data</span>
            </motion.button>
          </section>
        </aside>
      </div>
    </main>
  );
}
