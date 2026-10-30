"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election, ElectionState } from "@/lib/types";

function formatUtc(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Invalid server timestamp" : `${parsed.toLocaleString()} UTC`;
}

export default function ElectionsListPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [filterState, setFilterState] = useState<ElectionState | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void electionClient.getElections().then((nextElections) => {
      if (!cancelled) {
        setElections(nextElections);
        setError(null);
      }
    }).catch((cause) => {
      if (!cancelled) {
        setElections([]);
        setError(cause instanceof Error ? cause.message : "The election directory could not be loaded.");
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => elections.filter((election) => {
    const matchesFilter = filterState === "ALL" || election.state === filterState;
    const search = searchTerm.trim().toLowerCase();
    return matchesFilter && (!search || election.title.toLowerCase().includes(search));
  }), [elections, filterState, searchTerm]);

  const filters: Array<ElectionState | "ALL"> = ["ALL", "OPEN", "FROZEN", "PUBLISHED", "WITNESSED", "DRAFT"];

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header><h1 className="text-3xl font-bold tracking-tight text-[#10233F] dark:text-white">Campus Elections Directory</h1><p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Election lifecycle and manifest data are loaded from the authoritative election service. No local fixtures are substituted.</p></header>
      {loading && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">Loading elections…</div>}
      {error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">{error} The directory is unavailable until the service responds.</div>}
      {!loading && !error && (
        <>
          <div className="flex flex-col items-stretch justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] sm:flex-row sm:items-center">
            <label className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><span className="sr-only">Search elections</span><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by title" className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]" /></label>
            <div className="flex items-center gap-2 overflow-x-auto" aria-label="Filter elections"><span className="text-xs font-semibold text-slate-500">Filter</span>{filters.map((filter) => <button key={filter} type="button" onClick={() => setFilterState(filter)} className={`min-h-11 rounded-lg px-3 py-1.5 text-xs font-semibold ${filterState === filter ? "bg-[#157E92] text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{filter}</button>)}</div>
          </div>
          {filtered.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">No elections match the server-returned directory.</div>}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{filtered.map((election) => <article key={election.id} className="flex flex-col justify-between space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><div className="space-y-3"><div className="flex items-center justify-between"><StateBadge state={election.state} size="sm" /><span className="font-mono text-xs text-slate-500">{election.id}</span></div><h2 className="text-lg font-bold leading-snug text-[#10233F] dark:text-white">{election.title}</h2><p className="line-clamp-3 text-xs text-slate-600 dark:text-slate-400">Manifest details are available from the election service.</p></div><div className="space-y-3 border-t border-slate-100 pt-3 dark:border-[#1E3352]"><div className="space-y-1 text-xs text-slate-500"><div className="flex justify-between gap-3"><span>Opens</span><span className="font-mono text-right text-slate-700 dark:text-slate-300">{formatUtc(election.opens_at_utc)}</span></div><div className="flex justify-between gap-3"><span>Closes</span><span className="font-mono text-right text-slate-700 dark:text-slate-300">{formatUtc(election.closes_at_utc)}</span></div></div><div className="flex items-center justify-between gap-2">{election.state === "PUBLISHED" ? <Link href={`/results?election=${encodeURIComponent(election.id)}`} className="min-h-11 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-[#157E92]">Results and evidence</Link> : <span className="text-xs text-slate-500">Results unavailable until publication</span>}{election.state === "OPEN" ? <Link href={`/student/elections/${encodeURIComponent(election.id)}/candidates`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#157E92] px-4 py-2 text-xs font-bold text-white hover:bg-[#0E6273]">Open booth <ArrowRight className="size-3.5" aria-hidden="true" /></Link> : <Link href={`/audit?election=${encodeURIComponent(election.id)}`} className="min-h-11 px-3 py-2 text-xs font-semibold text-[#157E92]">Inspect evidence</Link>}</div></div></article>)}</div>
        </>
      )}
    </main>
  );
}
