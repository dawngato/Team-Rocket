"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  Download,
  FileCheck2,
  Fingerprint,
  History,
  Layers,
  LockKeyhole,
  Search,
  ShieldCheck,
  Vote,
} from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

interface StoredReceipt {
  handle: string;
  electionId?: string;
  title?: string;
  timestamp?: string;
}

export default function StudentReceiptsPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [electionId, setElectionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedReceipts, setSavedReceipts] = useState<StoredReceipt[]>([]);
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);

  useEffect(() => {
    try {
      const sessionRaw = window.sessionStorage.getItem("himvote_session_receipts");
      const localRaw = window.localStorage.getItem("himvote_receipts");
      const parsed: StoredReceipt[] = [];

      if (sessionRaw) {
        try {
          const arr = JSON.parse(sessionRaw);
          if (Array.isArray(arr)) parsed.push(...arr);
        } catch {}
      }

      if (localRaw) {
        try {
          const arr = JSON.parse(localRaw);
          if (Array.isArray(arr)) {
            for (const item of arr) {
              if (!parsed.some((p) => p.handle === item.handle)) {
                parsed.push(item);
              }
            }
          }
        } catch {}
      }

      setSavedReceipts(parsed);
    } catch {}
  }, []);

  const openReceipt = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextHandle = handle.trim();
    const nextElection = electionId.trim();
    if (!nextHandle) {
      setError("Please enter your opaque ballot receipt handle.");
      return;
    }
    setError(null);
    const url = nextElection
      ? `/student/receipts/${encodeURIComponent(nextHandle)}?election_id=${encodeURIComponent(nextElection)}`
      : `/student/receipts/${encodeURIComponent(nextHandle)}`;
    router.push(url);
  };

  const handleCopyHandle = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedHandle(val);
      setTimeout(() => setCopiedHandle(null), 2000);
    } catch {}
  };

  const handleDownloadArtifact = (rec: StoredReceipt) => {
    const exportData = {
      artifact_type: "himvote_local_receipt_tracker_export",
      schema_version: "2.0",
      handle: rec.handle,
      election_title: rec.title || null,
      election_id: rec.electionId || "unspecified",
      issued_at_utc: rec.timestamp || new Date().toISOString(),
      downloaded_at_utc: new Date().toISOString(),
      data_source_notice: "This export contains local browser tracker fields only. It is not signed and does not contain or verify a Merkle proof.",
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `himvote_receipt_${rec.handle.substring(0, 12)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const breadcrumbs = [
    { label: "Workspace", href: "/student" },
    { label: "Independent Verification" },
    { label: "Ballot Receipts" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1850px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      <Breadcrumbs items={breadcrumbs} />

      <header className="flex flex-col gap-4 border-b border-slate-200 pb-7 dark:border-[#1E3352] xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#157E92]/10 px-3 py-1 text-xs font-semibold text-[#157E92] dark:bg-[#38BDF8]/10 dark:text-[#38BDF8]">
            <Layers className="size-4" aria-hidden="true" />
            <span>Receipt Lookup</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white sm:text-4xl">
            Receipt Status and Proof Data
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Receipt handles listed here are read from this browser&apos;s storage. Enter a handle to load status from the configured casting service. Any Merkle path is checked separately and only against the root returned by that service.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Privacy Properties Not Verified Here</span>
        </div>
      </header>

      {/* Fluid Grid Layout: Left Column Search/Lookup + Right Column Saved Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lookup Form Card (7 Cols on Widescreen) */}
        <section
          className="lg:col-span-7 flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-[#1E3352] dark:bg-[#132135]"
          aria-labelledby="receipt-lookup-title"
        >
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#157E92]/10 text-[#157E92] dark:bg-[#38BDF8]/10 dark:text-[#38BDF8]">
              <FileCheck2 className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 id="receipt-lookup-title" className="text-xl font-bold text-[#10233F] dark:text-white">
                Inspect a Ballot Receipt
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Paste a receipt handle to request service-reported status and evidence fields. This page does not verify witness signatures or blockchain inclusion.
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={openReceipt}>
            <div>
              <label
                htmlFor="receipt-handle"
                className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Opaque Ballot Receipt Handle *
              </label>
              <input
                id="receipt-handle"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-transparent px-3.5 text-sm font-mono text-slate-900 outline-none transition focus:border-[#157E92] focus:ring-2 focus:ring-[#157E92]/20 dark:border-[#1E3352] dark:text-white"
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. rec_9f83a... or sha256 hex handle"
                required
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                Use the receipt handle shown by your casting service.
              </span>
            </div>

            <div>
              <label
                htmlFor="receipt-election-id"
                className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Election ID (Optional)
              </label>
              <input
                id="receipt-election-id"
                value={electionId}
                onChange={(event) => setElectionId(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-transparent px-3.5 text-sm font-mono text-slate-900 outline-none transition focus:border-[#157E92] focus:ring-2 focus:ring-[#157E92]/20 dark:border-[#1E3352] dark:text-white"
                autoComplete="off"
                spellCheck={false}
                placeholder="Election ID, if available"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-3 text-xs font-semibold text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
                {error}
              </p>
            )}

            <div className="pt-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#157E92] hover:bg-[#0E6273] px-6 text-sm font-bold text-white shadow-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92]"
              >
                <Search className="size-4" aria-hidden="true" />
                <span>Look Up Receipt Status</span>
              </motion.button>
            </div>
          </form>

          <aside className="mt-2 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 dark:border-[#1E3352] dark:bg-slate-900/40 dark:text-slate-400">
            <LockKeyhole className="size-4.5 mt-0.5 shrink-0 text-[#157E92] dark:text-[#38BDF8]" aria-hidden="true" />
            <p>
              <strong className="text-slate-900 dark:text-white">Browser storage note:</strong> Saved receipt handles are stored in this browser&apos;s local or session storage. This application does not establish whether backend records or operational logs can link a receipt to a person or selection. The download is a local tracker export, not a cryptographic artifact.
            </p>
          </aside>
        </section>

        {/* Saved Session Receipts (5 Cols on Widescreen) */}
        <section
          className="lg:col-span-5 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-[#1E3352] dark:bg-[#132135]"
          aria-labelledby="saved-receipts-title"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <History className="size-4 text-[#157E92] dark:text-[#38BDF8]" aria-hidden="true" />
              <h2 id="saved-receipts-title">Receipt Handles in Browser Storage</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {savedReceipts.length} Stored
            </span>
          </div>

          {savedReceipts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/30">
              <Vote className="size-8 mx-auto mb-2 text-slate-400 opacity-60" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No session receipts found</p>
              <p className="mt-1">A handle appears here only if this browser stored it.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {savedReceipts.map((rec) => (
                <motion.div
                  key={rec.handle}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-[#1E3352] dark:bg-slate-900/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#10233F] dark:text-white truncate">
                        {rec.title || "Cast Ballot Receipt"}
                      </div>
                      <code className="text-[11px] font-mono text-slate-500 truncate block mt-0.5" title={rec.handle}>
                        {rec.handle.substring(0, 24)}…
                      </code>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                      Saved
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCopyHandle(rec.handle)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        title="Copy receipt handle"
                      >
                        {copiedHandle === rec.handle ? (
                          <>
                            <Check className="size-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => handleDownloadArtifact(rec)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#157E92] hover:underline dark:text-[#38BDF8]"
                        title="Download local receipt tracker fields as JSON"
                      >
                        <Download className="size-3" />
                        <span>Artifact</span>
                      </button>
                    </div>

                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Link
                        href={
                          rec.electionId
                            ? `/student/receipts/${encodeURIComponent(rec.handle)}?election_id=${encodeURIComponent(rec.electionId)}`
                            : `/student/receipts/${encodeURIComponent(rec.handle)}`
                        }
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-[#157E92] hover:bg-[#0E6273] px-3 py-1 text-[11px] font-bold text-white shadow-2xs transition"
                      >
                        <span>Open Tracker</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
