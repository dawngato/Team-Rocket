"use client";

import { useState } from "react";
import { ArrowRight, FileCheck2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";

export default function StudentReceiptsPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [electionId, setElectionId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openReceipt = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextHandle = handle.trim();
    const nextElection = electionId.trim();
    if (!nextHandle || !nextElection) {
      setError("Enter both the opaque receipt handle and its election ID. The identity service does not maintain a student-to-receipt list.");
      return;
    }
    setError(null);
    router.push(`/student/receipts/${encodeURIComponent(nextHandle)}?election_id=${encodeURIComponent(nextElection)}`);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <header className="border-b border-[var(--sv-border-subtle)] pb-6">
        <p className="sv-eyebrow">Private tracker workflow</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--sv-text)] sm:text-3xl">Verify a receipt</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--sv-text-secondary)]">Receipts are locally held opaque trackers. Enter the tracker from your casting response to inspect accepted, witnessed, included, and tallied stages without exposing your selection.</p>
      </header>

      <section className="rounded-[var(--sv-radius-lg)] border border-[var(--sv-border)] bg-[var(--sv-surface)] p-5 sm:p-7" aria-labelledby="receipt-form-title">
        <div className="flex items-start gap-3">
          <span className="sv-access-icon !mb-0 !h-10 !w-10 !rounded-[10px]"><FileCheck2 size={18} aria-hidden="true" /></span>
          <div><h2 id="receipt-form-title" className="text-base font-semibold text-[var(--sv-text)]">Open a locally held receipt</h2><p className="mt-1 text-xs leading-5 text-[var(--sv-text-muted)]">No receipt lookup is performed until you provide both values.</p></div>
        </div>
        <form className="mt-6 space-y-4" onSubmit={openReceipt}>
          <div>
            <label htmlFor="receipt-handle" className="mb-1.5 block text-xs font-semibold text-[var(--sv-text-secondary)]">Opaque receipt handle</label>
            <input id="receipt-handle" value={handle} onChange={(event) => setHandle(event.target.value)} className="min-h-11 w-full rounded-[var(--sv-radius-sm)] border border-[var(--sv-border)] bg-[var(--sv-bg)] px-3 text-sm text-[var(--sv-text)] outline-none transition focus:border-[var(--sv-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sv-focus)_24%,transparent)]" autoComplete="off" spellCheck={false} placeholder="Paste the handle from the cast response" />
          </div>
          <div>
            <label htmlFor="receipt-election-id" className="mb-1.5 block text-xs font-semibold text-[var(--sv-text-secondary)]">Election ID</label>
            <input id="receipt-election-id" value={electionId} onChange={(event) => setElectionId(event.target.value)} className="min-h-11 w-full rounded-[var(--sv-radius-sm)] border border-[var(--sv-border)] bg-[var(--sv-bg)] px-3 text-sm font-mono text-[var(--sv-text)] outline-none transition focus:border-[var(--sv-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sv-focus)_24%,transparent)]" autoComplete="off" spellCheck={false} placeholder="election identifier" />
          </div>
          {error && <p className="text-sm text-[var(--sv-danger)]" role="alert">{error}</p>}
          <button type="submit" className="sv-primary-button !w-auto gap-2 px-5"><span>Open receipt</span><ArrowRight size={16} aria-hidden="true" /></button>
        </form>
      </section>

      <aside className="flex items-start gap-3 rounded-[var(--sv-radius-md)] border border-[var(--sv-border-subtle)] bg-[var(--sv-surface)] p-4 text-xs leading-5 text-[var(--sv-text-secondary)]"><LockKeyhole size={17} className="mt-0.5 shrink-0 text-[var(--sv-accent)]" aria-hidden="true" /><p><strong className="text-[var(--sv-text)]">Privacy boundary.</strong> Account recovery cannot recreate a lost receipt because an identity-to-ballot tracker join would weaken the intended separation.</p></aside>
    </div>
  );
}
