"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Award, Trophy } from "lucide-react";
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
        const [election, results] = await Promise.all([
          electionClient.getElection(summary.id),
          electionClient.getResults(summary.id),
        ]);
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
      <header className="space-y-2 border-b border-slate-200 pb-6 dark:border-[#1E3352]">
        <div className="inline-flex items-center gap-1.5 rounded bg-[#15805D]/10 px-2.5 py-1 text-xs font-semibold text-[#15805D] dark:text-[#34D399]">
          <Award className="size-3.5" aria-hidden="true" /> Results reported by the service
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#10233F] dark:text-white">
          Election Results
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This page displays only results returned by the configured service. It does not independently verify witness signatures, chain inclusion, or tally correctness. No sample results are substituted when service data is unavailable.
        </p>
      </header>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">
          Loading published results…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {!loading && !error && elections.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">
          The configured service returned no published election results.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {elections.map(({ election, results }) => (
          <article key={election.id} className="flex flex-col justify-between space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <StateBadge state={election.state} size="sm" />
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {results.total_ballots.toLocaleString()} ballots reported
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#10233F] dark:text-white">{election.title}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {election.contest || "Published contest"} · Digest: <span className="font-mono">{election.manifest_digest.substring(0, 16)}...</span>
              </p>
              {!results.privacy_limited && (
                <div className="space-y-2 pt-2">
                  {Object.entries(results.tally)
                    .sort((left, right) => right[1] - left[1])
                    .map(([candidate, count], idx) => (
                    <div key={candidate} className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs font-semibold dark:bg-slate-900/40">
                      <div className="flex items-center gap-2">
                        {idx === 0 && <Trophy className="size-3.5 text-amber-500" />}
                        <span>{candidate}</span>
                      </div>
                      <span className="font-mono text-[#157E92] dark:text-[#38BDF8]">{count.toLocaleString()} votes</span>
                    </div>
                    ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-[#1E3352]">
              <Link href={`/results?election=${encodeURIComponent(election.id)}`} className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-[#157E92] hover:underline">
                View reported result details <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
