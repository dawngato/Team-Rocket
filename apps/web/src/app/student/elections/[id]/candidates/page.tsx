"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election } from "@/lib/types";

export default function CandidateReviewPage() {
  const params = useParams();
  const electionId = params?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!electionId) return;
    let cancelled = false;
    void electionClient.getElection(electionId).then((nextElection) => {
      if (!cancelled) setElection(nextElection);
    }).catch(() => {
      if (!cancelled) setError("The authoritative candidate manifest could not be reached. No fixture list is substituted.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [electionId]);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <Link href={`/student/elections/${encodeURIComponent(electionId)}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-[#1E3352]"><ArrowLeft className="size-4" aria-hidden="true" /> Back to election</Link>
      {loading && <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm dark:border-[#1E3352] dark:bg-[#132135]" role="status">Loading the authoritative candidate manifest…</div>}
      {error && <div className="flex items-start gap-2 rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{error}</div>}
      {!loading && !error && election && (
        <>
          <header className="space-y-2 border-b border-slate-200 pb-6 dark:border-[#1E3352]"><div className="flex flex-wrap items-center gap-3"><StateBadge state={election.state} /><span className="font-mono text-xs text-slate-500">{election.id}</span></div><h1 className="text-3xl font-bold text-[#10233F] dark:text-white">{election.title}</h1></header>
          <section className="space-y-4" aria-labelledby="candidate-heading"><h2 id="candidate-heading" className="text-xl font-bold">Manifest candidates</h2>{election.candidates?.length ? <div className="grid gap-6 md:grid-cols-2">{election.candidates.map((candidate) => <article key={candidate.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><h3 className="text-base font-bold">{candidate.name}</h3><p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{candidate.statement || "No statement was supplied by the authoritative manifest."}</p><p className="font-mono text-[10px] text-slate-400">{candidate.id}</p></article>)}</div> : <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="status">The authoritative manifest did not return any candidates. Casting is blocked.</div>}</section>
        </>
      )}
    </main>
  );
}
