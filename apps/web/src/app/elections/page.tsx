"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Vote, Clock, CheckCircle2, ShieldCheck, Activity, Users } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election, ElectionState } from "@/lib/types";

function formatUtc(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Invalid timestamp" : parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  });
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    function calc() {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds, expired: false });
    }
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.expired) {
    return <span className="text-xs text-rose-500 font-semibold flex items-center gap-1"><Clock className="size-3" /> Concluded</span>;
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold tracking-tight">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span>Closes: {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s</span>
    </div>
  );
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

  const stats = useMemo(() => {
    const total = elections.length;
    const open = elections.filter(e => e.state === "OPEN").length;
    const published = elections.filter(e => e.state === "PUBLISHED").length;
    return { total, open, published };
  }, [elections]);

  const filtered = useMemo(() => elections.filter((election) => {
    const matchesFilter = filterState === "ALL" || election.state === filterState;
    const search = searchTerm.trim().toLowerCase();
    return matchesFilter && (!search || election.title.toLowerCase().includes(search));
  }), [elections, filterState, searchTerm]);

  const filters: Array<{ label: string; value: ElectionState | "ALL" }> = [
    { label: "All Directory", value: "ALL" },
    { label: "Active Voting", value: "OPEN" },
    { label: "Published Results", value: "PUBLISHED" },
    { label: "Frozen Manifest", value: "FROZEN" },
    { label: "Draft Stage", value: "DRAFT" },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      {/* Dynamic Hero Header with Live Metrics */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E3352] bg-gradient-to-br from-white via-slate-50 to-slate-100/60 dark:from-[#10233F] dark:via-[#0F1E36] dark:to-[#0B1524] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] text-xs font-semibold animate-linear-reveal-1">
              <Vote className="size-3.5" aria-hidden="true" />
              Institutional Election Registry
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white animate-linear-reveal-2">
              Campus Elections & Ballots
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300 leading-relaxed animate-linear-reveal-3">
              Cryptographically verified university election ballots. Review manifests, access voting booths during active hours, and inspect published Merkle trees.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto animate-linear-reveal-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white/80 dark:bg-[#132135]/80 backdrop-blur px-4 py-2.5 shadow-sm">
              <Activity className="size-5 text-[#157E92] dark:text-[#38BDF8]" />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Live Booths</p>
                <p className="text-lg font-bold text-[#10233F] dark:text-white">{stats.open} Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white/80 dark:bg-[#132135]/80 backdrop-blur px-4 py-2.5 shadow-sm">
              <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Published</p>
                <p className="text-lg font-bold text-[#10233F] dark:text-white">{stats.published} Verified</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-12 rounded-2xl border border-slate-200 bg-white dark:border-[#1E3352] dark:bg-[#132135]">
          <div className="flex flex-col items-center gap-3">
            <div className="size-7 border-2 border-[#157E92] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Querying authoritative election service...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-6 text-sm text-[#8B2630] dark:text-[#FCA5A5] flex items-start gap-3" role="alert">
          <div>
            <p className="font-bold">Service Directory Unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Controls Bar: Search + Filter Pills */}
          <div className="flex flex-col md:flex-row items-stretch justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search election by title, contest, or ID..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm shadow-sm transition-all focus:border-[#157E92] focus:outline-none focus:ring-2 focus:ring-[#157E92]/20 dark:border-[#1E3352] dark:bg-[#132135] dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" aria-label="Filter elections">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setFilterState(filter.value)}
                  className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                    filterState === filter.value
                      ? "bg-[#157E92] text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-[#132135] dark:text-slate-300 dark:hover:bg-slate-800 border border-slate-200 dark:border-[#1E3352]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-[#1E3352] dark:bg-[#132135]">
              <p className="font-bold text-[#10233F] dark:text-white text-base">No Matching Elections Found</p>
              <p className="text-xs text-slate-500 mt-1">Try refining your search keyword or switching the filter tab.</p>
            </div>
          )}

          {/* Elevated Interactive Election Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((election) => {
              const isOpen = election.state === "OPEN";
              const isPublished = election.state === "PUBLISHED";

              return (
                <article
                  key={election.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-[#157E92]/50 dark:border-[#1E3352] dark:bg-[#132135]"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <StateBadge state={election.state} size="sm" />
                      {isOpen && <CountdownTimer targetDate={election.closes_at_utc} />}
                      {!isOpen && (
                        <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                          {election.id}
                        </span>
                      )}
                    </div>

                    <div>
                      <h2 className="text-lg font-bold leading-snug text-[#10233F] dark:text-white group-hover:text-[#157E92] dark:group-hover:text-[#38BDF8] transition-colors">
                        {election.title}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                        Institutional election governed under RFC 9162 verifiable audit logging standards.
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 dark:bg-[#0B1524]/60 p-3.5 space-y-2 border border-slate-100 dark:border-[#1E3352]/60">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Opens:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{formatUtc(election.opens_at_utc)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Closes:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{formatUtc(election.closes_at_utc)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between gap-3">
                    {isPublished ? (
                      <Link
                        href={`/results?election=${encodeURIComponent(election.id)}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors"
                      >
                        <ShieldCheck className="size-4" />
                        View Official Results
                      </Link>
                    ) : isOpen ? (
                      <Link
                        href={`/student/elections/${encodeURIComponent(election.id)}/candidates`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#157E92] hover:bg-[#0E6273] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors"
                      >
                        <Vote className="size-4" />
                        Open Voting Booth
                        <ArrowRight className="size-3.5" />
                      </Link>
                    ) : (
                      <Link
                        href={`/audit?election=${encodeURIComponent(election.id)}`}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-[#1E3352] hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        Inspect Audit Trail
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
