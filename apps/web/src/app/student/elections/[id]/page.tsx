"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election } from "@/lib/types";

export default function ElectionDetailPage() {
  const params = useParams();
  const electionId = params?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!electionId) return;
    let cancelled = false;
    void electionClient.getElection(electionId).then((nextElection) => {
      if (!cancelled) {
        setElection(nextElection);
        setError(null);
      }
    }).catch(() => {
      if (!cancelled) {
        setElection(null);
        setError("The authoritative election manifest could not be reached. Voting is blocked until it is available.");
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [electionId]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/student/elections" className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium dark:border-[#1E3352] dark:bg-[#132135]">Back to elections</Link>
      {loading && <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm dark:border-[#1E3352] dark:bg-[#132135]" role="status">Loading election manifest…</div>}
      {error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">{error}</div>}
      {!loading && !error && election && (
        <>
          <header className="space-y-3 border-b border-slate-200 pb-6 dark:border-[#1E3352]">
            <div className="flex flex-wrap items-center gap-3"><StateBadge state={election.state} /><span className="font-mono text-xs text-slate-500">{election.id}</span></div>
            <h1 className="text-2xl font-bold text-[#17233B] dark:text-white">{election.title}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{election.description || "Review the server-authoritative manifest before proceeding."}</p>
          </header>
          <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-[#1E3352] dark:bg-[#132135]">
            <h2 className="mb-4 text-lg font-bold">Election status</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Opens</dt><dd>{election.opens_at_utc || "Not scheduled"}</dd></div>
              <div><dt className="text-slate-500">Closes</dt><dd>{election.closes_at_utc || "Not scheduled"}</dd></div>
              <div><dt className="text-slate-500">Manifest</dt><dd className="break-all font-mono text-xs">{election.manifest_digest || "Not frozen"}</dd></div>
              <div><dt className="text-slate-500">Eligibility</dt><dd>{election.eligible_count ?? "Not published"}</dd></div>
            </dl>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-[#1E3352] dark:bg-[#132135]">
            <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-lg font-bold">Manifest candidates</h2><Link href={`/student/elections/${encodeURIComponent(election.id)}/candidates`} className="text-xs font-bold text-[#157E92] hover:underline dark:text-[#38BDF8]">View profiles</Link></div>
            {election.candidates?.length ? <div className="grid gap-3 sm:grid-cols-2">{election.candidates.map((candidate) => <article key={candidate.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-[#1E3352] dark:bg-slate-900/30"><h3 className="font-bold">{candidate.name}</h3><p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{candidate.statement || "No statement was supplied by the authoritative manifest."}</p><p className="mt-3 font-mono text-[10px] text-slate-400">{candidate.id}</p></article>)}</div> : <p className="text-sm text-slate-600 dark:text-slate-300">No candidate records were returned by the manifest.</p>}
          </section>
          {election.state === "OPEN" && election.candidates?.length ? <Link href={`/student/elections/${encodeURIComponent(election.id)}/cast`} className="block min-h-11 rounded-lg bg-[#157E92] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#0E6273]">Open supported voting booth</Link> : <div className="rounded-lg border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="status">Casting is unavailable until the authoritative election is open and has candidates.</div>}
        </>
      )}
    </main>
  );
}
