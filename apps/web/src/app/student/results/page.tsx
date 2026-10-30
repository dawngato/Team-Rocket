"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Award } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election, PublishedResults } from "@/lib/types";

export default function StudentResultsPage() {
  const [elections, setElections] = useState<Array<{ election: Election; results: PublishedResults }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void electionClient.getElections().then(async (summaries) => {
      const published = summaries.filter((election) => election.state === "PUBLISHED");
      const entries = await Promise.all(published.map(async (summary) => {
        const [election, results] = await Promise.all([electionClient.getElection(summary.id), electionClient.getResults(summary.id)]);
        return { election, results };
      }));
      if (!cancelled) setElections(entries);
    }).catch((cause) => {
      if (!cancelled) {
        setElections([]);
        setError(cause instanceof Error ? cause.message : "Published results could not be loaded.");
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-2 border-b border-slate-200 pb-6 dark:border-[#1E3352]"><div className="inline-flex items-center gap-1.5 rounded bg-[#15805D]/10 px-2.5 py-1 text-xs font-semibold text-[#15805D] dark:text-[#34D399]"><Award className="size-3.5" aria-hidden="true" /> Published outcomes</div><h1 className="text-3xl font-bold tracking-tight text-[#10233F] dark:text-white">Election Results and Attestations</h1><p className="text-sm text-slate-600 dark:text-slate-400">Results are shown only after the authoritative service reports publication. The independent verifier remains the source of cryptographic assurance.</p></header>
      {loading && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">Loading published results…</div>}
      {error && <div className="flex items-start gap-2 rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{error} No local results are substituted.</div>}
      {!loading && !error && elections.length === 0 && <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="status">No published results are available.</div>}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{elections.map(({ election, results }) => <article key={election.id} className="flex flex-col justify-between space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><div className="space-y-3"><div className="flex items-center justify-between"><StateBadge state={election.state} size="sm" /><span className="font-mono text-xs text-slate-500">{results.total_ballots} ballots</span></div><h2 className="text-lg font-bold text-[#10233F] dark:text-white">{election.title}</h2><p className="text-xs text-slate-600 dark:text-slate-400">{election.contest || "Published contest"} · manifest {election.manifest_digest}</p>{!results.privacy_limited && <div className="space-y-2">{Object.entries(results.tally).map(([candidate, count]) => <div key={candidate} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs font-semibold dark:bg-slate-900/40"><span>{candidate}</span><span className="font-mono text-[#157E92]">{count} votes</span></div>)}</div>}{results.privacy_limited && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">Detailed tally is suppressed by the published privacy policy.</div>}</div><div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-[#1E3352]"><Link href={`/results?election=${encodeURIComponent(election.id)}`} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[#157E92] hover:underline">Detailed evidence <ArrowRight className="size-3.5" aria-hidden="true" /></Link><Link href={`/audit?election=${encodeURIComponent(election.id)}`} className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white">Audit ledger</Link></div></article>)}</div>
    </main>
  );
}
