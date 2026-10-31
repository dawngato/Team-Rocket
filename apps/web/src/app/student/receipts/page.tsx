"use client";

import { useEffect, useState } from "react";
import { ArrowRight, FileCheck2, History, LockKeyhole, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
      setError("Please enter the opaque receipt handle.");
      return;
    }
    setError(null);
    const url = nextElection
      ? `/student/receipts/${encodeURIComponent(nextHandle)}?election_id=${encodeURIComponent(nextElection)}`
      : `/student/receipts/${encodeURIComponent(nextHandle)}`;
    router.push(url);
  };

  const breadcrumbs = [
    { label: "Workspace", href: "/student" },
    { label: "Verify Receipts" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 sm:px-6 py-6 sm:py-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]">
        <p className="text-xs font-bold uppercase tracking-wider text-[#157E92] dark:text-[#38BDF8]">
          Cryptographic Verification
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#10233F] dark:text-white sm:text-3xl">
          Verify a Receipt Tracker
        </h1>
        <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Receipts are locally held opaque trackers. Enter the tracker from your casting response to inspect accepted, witnessed, included, and tallied stages without exposing your selection.
        </p>
      </header>

      {/* Quick Select for Session Receipts */}
      {savedReceipts.length > 0 && (
        <section
          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6 dark:border-[#1E3352] dark:bg-slate-900/40 space-y-3"
          aria-labelledby="saved-receipts-title"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <History className="size-4 text-[#157E92]" aria-hidden="true" />
            <h2 id="saved-receipts-title">Receipts Found in Browser Storage</h2>
          </div>
          <div className="grid gap-2.5">
            {savedReceipts.map((rec) => (
              <div
                key={rec.handle}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white dark:border-[#1E3352] dark:bg-[#132135]"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#10233F] dark:text-white truncate">
                    {rec.title || "Cast Ballot Receipt"}
                  </div>
                  <code className="text-[11px] font-mono text-slate-500 truncate block mt-0.5">
                    {rec.handle}
                  </code>
                </div>
                <Link
                  href={
                    rec.electionId
                      ? `/student/receipts/${encodeURIComponent(rec.handle)}?election_id=${encodeURIComponent(rec.electionId)}`
                      : `/student/receipts/${encodeURIComponent(rec.handle)}`
                  }
                  className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#157E92] hover:bg-[#0E6273] px-3.5 py-1.5 text-xs font-bold text-white transition-colors"
                >
                  <span>Open Tracker</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search / Lookup Form */}
      <section
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"
        aria-labelledby="receipt-form-title"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8]">
            <FileCheck2 size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 id="receipt-form-title" className="text-base font-bold text-[#10233F] dark:text-white">
              Open a Locally Held Receipt
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Paste the opaque handle from your casting confirmation to retrieve witness and inclusion states.
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={openReceipt}>
          <div>
            <label
              htmlFor="receipt-handle"
              className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Opaque Receipt Handle *
            </label>
            <input
              id="receipt-handle"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm font-mono text-slate-900 outline-none transition focus:border-[#157E92] focus:ring-2 focus:ring-[#157E92]/20 dark:border-[#1E3352] dark:text-white"
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. rec_9f83a... or sha256 hex handle"
              required
            />
          </div>

          <div>
            <label
              htmlFor="receipt-election-id"
              className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Election ID (Optional)
            </label>
            <input
              id="receipt-election-id"
              value={electionId}
              onChange={(event) => setElectionId(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-sm font-mono text-slate-900 outline-none transition focus:border-[#157E92] focus:ring-2 focus:ring-[#157E92]/20 dark:border-[#1E3352] dark:text-white"
              autoComplete="off"
              spellCheck={false}
              placeholder="election-id (auto-resolved if left blank)"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-[#C23C45]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#157E92] hover:bg-[#0E6273] active:scale-[0.98] px-6 text-sm font-bold text-white shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92]"
          >
            <Search size={16} aria-hidden="true" />
            <span>Look Up Receipt Status</span>
          </button>
        </form>
      </section>

      <aside className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 dark:border-[#1E3352] dark:bg-slate-900/40 dark:text-slate-400">
        <LockKeyhole size={18} className="mt-0.5 shrink-0 text-[#157E92]" aria-hidden="true" />
        <p>
          <strong className="text-slate-900 dark:text-white">Privacy boundary:</strong> Account recovery cannot recreate a lost receipt because storing an identity-to-ballot link would eliminate secret ballot protections. Keep your receipt tracker downloaded safely.
        </p>
      </aside>
    </div>
  );
}
