"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Award, Plus, Search, Filter, ArrowRight, Calendar, Users, Lock, Send, Users2 } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { INITIAL_ELECTIONS } from "@/lib/mock_data";
import { ElectionState } from "@/lib/types";

export default function OfficerElectionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("ALL");

  const filteredElections = INITIAL_ELECTIONS.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.contest && e.contest.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesState = stateFilter === "ALL" || e.state === stateFilter;
    return matchesSearch && matchesState;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            <Award className="w-3.5 h-3.5" aria-hidden="true" />
            Election Portfolio
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            My Elections
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Manage candidate nominations, roster signoffs, schedules, manifest freezing, and result publication.
          </p>
        </div>
        <Link
          href="/officer/create"
          className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Create New Election</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, ID, or contest..."
            className="w-full min-h-[44px] pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">State:</span>
          {["ALL", "DRAFT", "OPEN", "WITNESSED", "ANCHOR_FINALIZED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStateFilter(st)}
              className={`min-h-[36px] px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] ${
                stateFilter === st
                  ? "bg-[#10233F] text-white dark:bg-[#157E92]"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Election Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredElections.map((elec) => (
          <div
            key={elec.id}
            className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-5 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs text-slate-400">{elec.id}</span>
                <StateBadge state={elec.state} size="sm" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#10233F] dark:text-white">
                  {elec.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  <strong>Contest:</strong> {elec.contest || "General"} |{" "}
                  <strong>Selection Rule:</strong> {elec.selection_rule || "Plurality"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div>
                  <strong>Eligible Voters:</strong> {elec.eligible_count?.toLocaleString()}
                </div>
                <div>
                  <strong>Voting Closes:</strong> {new Date(elec.closes_at_utc).toLocaleString()}
                </div>
                <div className="truncate">
                  <strong>Manifest Digest:</strong>{" "}
                  <code className="text-[10px] font-mono">{elec.manifest_digest}</code>
                </div>
              </div>
            </div>

            {/* Officer Action Links */}
            <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <Link
                href={`/officer/elections/${elec.id}/candidates`}
                className="p-2 rounded bg-slate-50 dark:bg-slate-800 hover:bg-[#157E92]/10 hover:text-[#157E92] transition-colors text-center font-semibold text-slate-700 dark:text-slate-300"
              >
                Candidates
              </Link>
              <Link
                href={`/officer/elections/${elec.id}/roster`}
                className="p-2 rounded bg-slate-50 dark:bg-slate-800 hover:bg-[#157E92]/10 hover:text-[#157E92] transition-colors text-center font-semibold text-slate-700 dark:text-slate-300"
              >
                Roster Review
              </Link>
              <Link
                href={`/officer/elections/${elec.id}/schedule`}
                className="p-2 rounded bg-slate-50 dark:bg-slate-800 hover:bg-[#157E92]/10 hover:text-[#157E92] transition-colors text-center font-semibold text-slate-700 dark:text-slate-300"
              >
                Schedule
              </Link>
              <Link
                href={`/officer/elections/${elec.id}/freeze`}
                className="p-2 rounded bg-slate-50 dark:bg-slate-800 hover:bg-[#157E92]/10 hover:text-[#157E92] transition-colors text-center font-semibold text-slate-700 dark:text-slate-300"
              >
                Freeze Manifest
              </Link>
              <Link
                href={`/officer/elections/${elec.id}/lifecycle`}
                className="p-2 rounded bg-slate-50 dark:bg-slate-800 hover:bg-[#157E92]/10 hover:text-[#157E92] transition-colors text-center font-semibold text-slate-700 dark:text-slate-300"
              >
                Lifecycle
              </Link>
              <Link
                href={`/officer/elections/${elec.id}/publication`}
                className="p-2 rounded bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] hover:bg-[#157E92]/20 transition-colors text-center font-bold"
              >
                Publication
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
