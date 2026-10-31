"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Award } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election, PublishedResults } from "@/lib/types";

export default function StudentResultsPage() {
  const [entries, setEntries] = useState<Array<{ election: Election; results: PublishedResults }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void electionClient.getElections().then(async (summaries) => {
      const published = summaries.filter((election) => election.state === "PUBLISHED");
      const nextEntries = await Promise.all(published.map(async (summary) => ({
        election: await electionClient.getElection(summary.id),
        results: await electionClient.getResults(summary.id),
      })));
      if (!cancelled) { setEntries(nextEntries); setError(null); }
    }).catch(() => {
      if (!cancelled) { setEntries([]); setError("Published results could not be loaded from the authoritative service."); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-2 border-b border-slate-200 pb-6 dark:border-[#1E3352]"><div className="inline-flex items-center gap-1.5 rounded bg-[#15805D]/10 px-2.5 py-1 text-xs font-semibold text-[#15805D] dark:text-[#34D399]"><Award className="size-3.5" aria-hidden="true" /> Published outcomes</div><h1 className="text-3xl font-bold text-[#10233F] dark:text-white">Election Results and Attestations</h1><p className="text-sm text-slate-600 dark:text-slate-400">Only results returned by the published election service are shown.</p></header>
      {loading && <p className="text-sm text-slate-500" role="status">Loading published results…</p>}
      {error && <div className="flex items-start gap-2 rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert"><AlertCircle className="mt-0.5 size-4" aria-hidden="true" /> {error}</div>}
      {!loading && !error && entries.length === 0 && <p className="rounded-xl border border-slate-200 p-6 text-sm text-slate-600 dark:border-[#1E3352] dark:text-slate-300" role="status">No published election results are currently available.</p>}
      <div className="grid gap-6 md:grid-cols-2">{entries.map(({ election, results }) => <article key={election.id} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><div className="flex items-center justify-between"><StateBadge state={election.state} size="sm" /><span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">{results.total_ballots.toLocaleString()} ballots</span></div><h2 className="text-xl font-bold text-[#10233F] dark:text-white">{election.title}</h2><p className="text-xs text-slate-500">Manifest {results.manifest_digest}</p>{results.privacy_limited ? <p className="text-sm text-slate-600 dark:text-slate-300">This result is privacy limited; the service did not publish candidate-level counts.</p> : <div className="space-y-2">{Object.entries(results.tally).sort(([, a], [, b]) => b - a).map(([candidate, count]) => <div key={candidate} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900/40"><span>{candidate}</span><span className="font-mono">{count.toLocaleString()}</span></div>)}</div>}</article>)}</div>
    </main>
  );
}
