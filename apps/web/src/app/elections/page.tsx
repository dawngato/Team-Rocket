"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Vote, Clock, CheckCircle2, ShieldCheck, Activity, Users, AlertCircle, RefreshCw } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election, ElectionState } from "@/lib/types";

export default function ElectionsListPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [filterState, setFilterState] = useState<ElectionState | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchElections = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await electionClient.getElections();
      setElections(data || []);
      setError(null);
    } catch (err: unknown) {
      setElections([]);
      setError(err instanceof Error ? err.message : "The election service is currently unavailable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchElections();
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

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-[#1E3352] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-2">
            <Activity className="w-3.5 h-3.5" aria-hidden="true" />
            Institutional Registry
          </div>
          <h1 className="text-3xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
            Institutional Elections
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Inspect all scheduled, ongoing, and certified election contests published by institutional authorities.
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-white dark:bg-[#132135] rounded-xl border border-slate-200 dark:border-[#1E3352] shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Published Contests</span>
            <span className="text-lg font-extrabold text-[#10233F] dark:text-white font-mono">{stats.total}</span>
          </div>
          <div className="px-4 py-2 bg-white dark:bg-[#132135] rounded-xl border border-slate-200 dark:border-[#1E3352] shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Active Polling</span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{stats.open}</span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <label htmlFor="election-search" className="sr-only">Search contests</label>
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            id="election-search"
            type="text"
            placeholder="Search by contest title or slate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] rounded-xl text-sm text-[#10233F] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#157E92]"
          />
        </div>

        {/* State Filters */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto" role="tablist" aria-label="Filter elections by state">
          {(["ALL", "OPEN", "FROZEN", "PUBLISHED", "CLOSED"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterState(st)}
              role="tab"
              aria-selected={filterState === st}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterState === st
                  ? "bg-[#10233F] dark:bg-[#38BDF8] text-white dark:text-[#07111E] shadow-sm"
                  : "bg-white dark:bg-[#132135] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1E3352] hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {st === "ALL" ? "All Contests" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-16 bg-slate-100 dark:bg-slate-900 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-base font-bold text-red-800 dark:text-red-300">
            Election Service Connection Error
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {error}
          </p>
          <button
            onClick={fetchElections}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] space-y-3">
          <Vote className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            No elections are currently available.
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Please check again later or contact your campus election officer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((elec) => (
            <div
              key={elec.id}
              className="group p-6 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400 font-semibold truncate max-w-[150px]">
                    {elec.id}
                  </span>
                  <StateBadge state={elec.state} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-[#10233F] dark:text-white group-hover:text-[#157E92] dark:group-hover:text-[#38BDF8] transition-colors leading-snug">
                    {elec.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {elec.contest || "Institutional election contest"}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[#0E1A2B] rounded-xl border border-slate-100 dark:border-[#1E3352] text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Eligible Voters:
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {elec.eligible_count ? elec.eligible_count.toLocaleString() : "Authorized roster"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Closes:
                    </span>
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {elec.closes_at_utc ? new Date(elec.closes_at_utc).toLocaleDateString() : "TBD"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between">
                <Link
                  href={elec.state === "OPEN" ? `/student/elections/${elec.id}/cast` : `/elections`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline"
                >
                  <span>{elec.state === "OPEN" ? "Enter Voting Booth" : "View Manifest"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <span className="text-[10px] text-slate-400 font-mono">
                  {elec.candidates?.length || 0} Candidates
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
