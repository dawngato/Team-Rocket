"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Filter, Plus, RefreshCw, Search } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient, ElectionApiError } from "@/lib/election_client";
import type { Election, ElectionState } from "@/lib/types";
import { filterOfficerElections, formatUtcDate } from "@/lib/officer_elections";

const stateFilters: Array<ElectionState | "ALL"> = ["ALL", "DRAFT", "OPEN", "FROZEN", "WITNESSED", "ANCHOR_FINALIZED", "PUBLISHED"];

export default function OfficerElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<ElectionState | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ElectionApiError | Error | null>(null);

  const loadElections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setElections(await electionClient.getElections());
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

  const filteredElections = useMemo(
    () => filterOfficerElections(elections, searchQuery, stateFilter),
    [elections, searchQuery, stateFilter],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 dark:border-[#1E3352] sm:flex-row sm:items-center">
        <div>
          <Link href="/officer" className="mb-2 inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-[#157E92] hover:underline dark:text-[#38BDF8]">
            <ArrowRight className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
            Back to Officer Desk
          </Link>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded bg-[#157E92]/10 px-2.5 py-0.5 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8]">
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            Election portfolio
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#10233F] dark:text-white">My Elections</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Review only records returned by the authenticated election service. Candidate and manifest details remain server-authoritative.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadElections()}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-[#1E3352] dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
          <Link href="/officer/create" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#157E92] px-4 py-2 text-sm font-bold text-white hover:bg-[#0E6273] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]">
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
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">
          Loading assigned elections…
        </div>
      ) : !error && elections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-[#1E3352] dark:bg-[#132135]" role="status">
          <Award className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 font-bold text-[#10233F] dark:text-white">No assigned elections</h2>
          <p className="mt-1 text-sm text-slate-500">The election service returned no officer-scoped records.</p>
        </div>
      ) : !loading && !error ? (
        <>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <label htmlFor="officer-election-search" className="sr-only">Search assigned elections</label>
              <input
                id="officer-election-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title, ID, or contest"
                className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-[#10233F] focus:outline-none focus:ring-2 focus:ring-[#157E92] dark:border-[#1E3352] dark:bg-[#132135] dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Filter elections by state">
              <Filter className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              {stateFilters.map((state) => (
                <button
                  key={state}
                  type="button"
                  aria-pressed={stateFilter === state}
                  onClick={() => setStateFilter(state)}
                  className={`min-h-[40px] rounded px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] ${stateFilter === state ? "bg-[#10233F] text-white dark:bg-[#157E92]" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>

          {filteredElections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-[#1E3352] dark:bg-[#132135]" role="status">
              <p className="font-semibold text-[#10233F] dark:text-white">No elections match this filter.</p>
              <p className="mt-1 text-sm text-slate-500">Clear the search or choose another lifecycle state.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {filteredElections.map((election) => (
                <article key={election.id} className="flex flex-col justify-between space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs text-slate-400">{election.id}</span>
                      <StateBadge state={election.state} size="sm" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#10233F] dark:text-white">{election.title}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        <strong>Contest:</strong> {election.contest || "Not provided"}{" "}
                        {election.selection_rule && <><span aria-hidden="true">·</span> <strong>Rule:</strong> {election.selection_rule}</>}
                      </p>
                    </div>
                    <div className="space-y-1 rounded-lg bg-slate-50/70 p-3 text-xs text-slate-600 dark:bg-slate-900/30 dark:text-slate-400">
                      <div><strong>Eligible voters:</strong> {election.eligible_count ?? "Not provided"}</div>
                      <div><strong>Voting closes:</strong> {formatUtcDate(election.closes_at_utc)}</div>
                      <div><strong>Manifest:</strong> Open the election workspace for the server-returned manifest digest.</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-xs dark:border-[#1E3352] sm:grid-cols-3">
                    {[
                      ["Candidates", "candidates"],
                      ["Roster review", "roster"],
                      ["Schedule", "schedule"],
                      ["Freeze manifest", "freeze"],
                      ["Lifecycle", "lifecycle"],
                      ["Publication", "publication"],
                    ].map(([label, route]) => (
                      <Link
                        key={route}
                        href={`/officer/elections/${election.id}/${route}`}
                        className="min-h-[40px] rounded bg-slate-50 px-2 py-2 text-center font-semibold text-slate-700 transition-colors hover:bg-[#157E92]/10 hover:text-[#157E92] dark:bg-slate-800 dark:text-slate-300"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
