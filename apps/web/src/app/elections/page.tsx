"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Filter, Calendar, Users, ArrowRight } from "lucide-react";
import { StateBadge } from "../../components/StateBadge";
import { INITIAL_ELECTIONS } from "../../lib/mock_data";
import { ElectionState } from "../../lib/types";

export default function ElectionsListPage() {
  const [filterState, setFilterState] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = INITIAL_ELECTIONS.filter((e) => {
    const matchesFilter = filterState === "ALL" || e.state === filterState;
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.contest && e.contest.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
          Campus Elections Directory
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl">
          Browse active voting contests, frozen manifests awaiting opening, and witnessed historical tallies.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white dark:bg-[#132135] p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title or contest..."
            aria-label="Search elections"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter:</span>
          {["ALL", "OPEN", "FROZEN", "WITNESSED", "ANCHOR_FINALIZED", "DRAFT"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterState(st)}
              className={`min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                filterState === st
                  ? "bg-[#157E92] text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Elections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((elec) => (
          <article
            key={elec.id}
            className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <StateBadge state={elec.state} size="sm" />
                <span className="text-xs text-slate-500 font-mono">
                  {elec.eligible_count} Eligible
                </span>
              </div>
              <h2 className="font-bold text-lg text-[#10233F] dark:text-white leading-snug">
                {elec.title}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                {elec.description}
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-[#1E3352]">
              <div className="text-xs text-slate-500 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Opens:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {new Date(elec.opens_at_utc).toLocaleString()} UTC
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Closes:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {new Date(elec.closes_at_utc).toLocaleString()} UTC
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  href={`/results?election=${elec.id}`}
                  className="min-h-[44px] px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#157E92] transition-colors flex items-center gap-1"
                >
                  Results and Proofs
                </Link>
                {elec.state === "OPEN" ? (
                  <Link
                    href={`/student/elections/${elec.id}/candidates`}
                    className="min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Cast Ballot</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                ) : (
                  <Link
                    href={`/audit?election=${elec.id}`}
                    className="min-h-[44px] px-3 py-1.5 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
                  >
                    Inspect Ledger
                  </Link>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
