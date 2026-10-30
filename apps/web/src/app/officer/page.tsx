"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Plus, RefreshCw } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient, ElectionApiError } from "@/lib/election_client";
import type { Election } from "@/lib/types";
import { summarizeOfficerElections, formatUtcDate } from "@/lib/officer_elections";

export default function OfficerOverviewPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ElectionApiError | Error | null>(null);

  const loadElections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setElections(await electionClient.getElections({ includeInternal: true }));
    } catch (cause) {
      setElections([]);
      setError(cause instanceof Error ? cause : new Error("The election service could not be reached."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadElections();
  }, [loadElections]);

  const metrics = useMemo(() => summarizeOfficerElections(elections), [elections]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 dark:border-[#1E3352] sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded bg-[#157E92]/10 px-2.5 py-0.5 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8]">
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Election administration desk</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white">Election Officer Desk</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Live election service data for assigned elections. No local election fixtures are used on this operational screen.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadElections()}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60 dark:border-[#1E3352] dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
          <Link
            href="/officer/create"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#157E92] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0E6273] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create election
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630] dark:text-[#FCA5A5] sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>{error.message}</span>
          <button type="button" onClick={() => void loadElections()} className="min-h-[44px] rounded-lg border border-[#C23C45]/40 px-3 py-2 font-bold hover:bg-[#C23C45]/10">
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">
          Loading assigned elections…
        </div>
      ) : !error && elections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-[#1E3352] dark:bg-[#132135]" role="status">
          <Award className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 font-bold text-[#10233F] dark:text-white">No assigned elections</h2>
          <p className="mt-1 text-sm text-slate-500">The election service returned no officer-scoped records.</p>
        </div>
      ) : !loading && !error ? (
        <>
          <section aria-label="Election service metrics" className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              ["Active elections", metrics.active, "OPEN, FROZEN, SCHEDULED, PAUSED, or CLOSING"],
              ["Draft elections", metrics.drafts, "Not yet frozen"],
              ["Governed elections", metrics.governed, "Returned by the service"],
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
                <div className="mt-2 font-mono text-3xl font-extrabold tabular-nums text-[#10233F] dark:text-white">{value}</div>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{detail}</span>
              </div>
            ))}
          </section>

          <section aria-labelledby="officer-actions-heading" className="space-y-4">
            <h2 id="officer-actions-heading" className="text-xl font-bold tracking-tight text-[#10233F] dark:text-white">Election management lifecycle</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Link href="/officer/elections" className="flex min-h-[180px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#157E92] dark:border-[#1E3352] dark:bg-[#132135] dark:hover:border-[#38BDF8]">
                <div>
                  <Award className="h-8 w-8 text-[#157E92] dark:text-[#38BDF8]" aria-hidden="true" />
                  <h3 className="mt-4 font-bold text-[#10233F] dark:text-white">Open assigned portfolio</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Filter server-returned elections by lifecycle state.</p>
                </div>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#157E92] dark:text-[#38BDF8]">View portfolio <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
              </Link>
              {elections[0] ? (
                <Link href={`/officer/elections/${elections[0].id}/lifecycle`} className="flex min-h-[180px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#AA6C0B] dark:border-[#1E3352] dark:bg-[#132135] dark:hover:border-[#FBBF24]">
                  <div>
                    <StateBadge state={elections[0].state} size="sm" />
                    <h3 className="mt-4 font-bold text-[#10233F] dark:text-white">Open election workspace</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{elections[0].title}</p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#AA6C0B] dark:text-[#FBBF24]">Open workspace <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                </Link>
              ) : (
                <div className="flex min-h-[180px] flex-col justify-between rounded-2xl border border-dashed border-slate-300 p-6 dark:border-[#1E3352]">
                  <div>
                    <h3 className="font-bold text-slate-500 dark:text-slate-400">Election workspace unavailable</h3>
                    <p className="mt-1 text-sm text-slate-500">A server-returned election is required before a workspace can be opened.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="monitored-elections-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-[#1E3352]">
              <div>
                <h2 id="monitored-elections-heading" className="font-bold tracking-tight text-[#10233F] dark:text-white">Monitored elections</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Server-authoritative lifecycle and schedule data.</p>
              </div>
              <Link href="/officer/elections" className="text-xs font-bold text-[#157E92] hover:underline dark:text-[#38BDF8]">View all ({elections.length})</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-[#1E3352] dark:bg-slate-900/50">
                  <tr><th scope="col" className="px-6 py-3">Election</th><th scope="col" className="px-6 py-3">State</th><th scope="col" className="px-6 py-3">Close time UTC</th><th scope="col" className="px-6 py-3">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
                  {elections.slice(0, 4).map((election) => (
                    <tr key={election.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="px-6 py-4"><div className="font-bold text-[#10233F] dark:text-white">{election.title}</div><div className="font-mono text-xs text-slate-400">{election.id}</div></td>
                      <td className="px-6 py-4"><StateBadge state={election.state} size="sm" /></td>
                      <td className="px-6 py-4 text-xs text-slate-500">{formatUtcDate(election.closes_at_utc)}</td>
                      <td className="px-6 py-4"><Link href={`/officer/elections/${election.id}/lifecycle`} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold text-[#157E92] hover:bg-[#157E92]/10 dark:text-[#38BDF8]">Lifecycle <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
