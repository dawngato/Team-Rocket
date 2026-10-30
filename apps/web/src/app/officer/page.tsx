"use client";

import React from "react";
import Link from "next/link";
import { Award, Plus, Lock, ArrowRight } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { INITIAL_ELECTIONS } from "@/lib/mock_data";

export default function OfficerOverviewPage() {
  const activeElections = INITIAL_ELECTIONS.filter((e) => e.state === "OPEN" || e.state === "FROZEN");
  const draftElections = INITIAL_ELECTIONS.filter((e) => e.state === "DRAFT");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            <Award className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Election Administration Desk</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
            Election Officer Desk
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
            Build manifests, lock voter rosters, control voting windows, and request evidence based publication review.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/officer/elections"
            className="min-h-[44px] px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1E3352] hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] rounded-xl transition-all duration-75 ease-out flex items-center gap-2 text-sm select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1524]"
          >
            <span>My Elections</span>
          </Link>
          <Link
            href="/officer/create"
            className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] active:scale-[0.98] rounded-xl transition-all duration-75 ease-out flex items-center gap-2 text-sm shadow-sm select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1524]"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Create New Election</span>
          </Link>
        </div>
      </div>

      {/* Metrics with High Contrast Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Contests
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] border border-[#157E92]/30">
              Live
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#157E92] dark:text-[#38BDF8] font-mono tabular-nums">
            {activeElections.length}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Currently accepting encrypted ballots or frozen
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Draft Contests
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#AA6C0B]/10 text-[#AA6C0B] dark:text-[#FBBF24] border border-[#AA6C0B]/30">
              Pre Freeze
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#AA6C0B] dark:text-[#FBBF24] font-mono tabular-nums">
            {draftElections.length}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Rosters or candidate slates pending manifest lock
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Governed Contests
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1E3352]">
              Institutional
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#10233F] dark:text-white font-mono tabular-nums">
            {INITIAL_ELECTIONS.length}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Full governance and publication audit trail
          </span>
        </div>
      </div>

      {/* Quick Action Workspaces */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#10233F] dark:text-white tracking-tight">
          Election Management Lifecycle
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/officer/elections"
            className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#157E92] dark:hover:border-[#38BDF8] transition-all duration-75 ease-out active:scale-[0.98] select-none flex flex-col justify-between space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1524]"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] flex items-center justify-center">
                <Award className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Contest Portfolio
                </span>
                <h3 className="font-bold text-base text-[#10233F] dark:text-white tracking-tight">
                  All Assigned Elections
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                View and manage complete election roster, freeze windows, and state transitions.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#157E92] dark:text-[#38BDF8]">
              <span>Open Portfolio</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </div>
          </Link>

          <Link
            href="/officer/create"
            className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#15805D] dark:hover:border-[#34D399] transition-all duration-75 ease-out active:scale-[0.98] select-none flex flex-col justify-between space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1524]"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] flex items-center justify-center">
                <Plus className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  New Specification
                </span>
                <h3 className="font-bold text-base text-[#10233F] dark:text-white tracking-tight">
                  Create Election Draft
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Define contest parameters, eligible department boundaries, and UTC voting cutoffs.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#15805D] dark:text-[#34D399]">
              <span>New Contest</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </div>
          </Link>

          <Link
            href="/officer/elections/elec_cs_2026/freeze"
            className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#AA6C0B] dark:hover:border-[#FBBF24] transition-all duration-75 ease-out active:scale-[0.98] select-none flex flex-col justify-between space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1524]"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#AA6C0B]/10 text-[#AA6C0B] dark:text-[#FBBF24] flex items-center justify-center">
                <Lock className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  RFC 8785 Digest
                </span>
                <h3 className="font-bold text-base text-[#10233F] dark:text-white tracking-tight">
                  Freeze Manifest Tool
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Lock roster commitment and manifest digest before initiating the voting phase.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#AA6C0B] dark:text-[#FBBF24]">
              <span>Manifest Locker</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </div>
          </Link>
        </div>
      </div>

      {/* Active Contests Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1E3352] flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-[#10233F] dark:text-white tracking-tight">
              Monitored Contests
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live state indicators for active campus and department ballots.
            </p>
          </div>
          <Link
            href="/officer/elections"
            className="text-xs font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline"
          >
            View All ({INITIAL_ELECTIONS.length})
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-[#1E3352]">
              <tr>
                <th scope="col" className="px-6 py-3">Contest Title</th>
                <th scope="col" className="px-6 py-3">State</th>
                <th scope="col" className="px-6 py-3">Eligible Voters</th>
                <th scope="col" className="px-6 py-3">Closing Time (UTC)</th>
                <th scope="col" className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {INITIAL_ELECTIONS.slice(0, 4).map((el) => (
                <tr key={el.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="px-6 py-4">
                    <div className="font-bold text-[#10233F] dark:text-white tracking-tight">{el.title}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{el.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <StateBadge state={el.state} size="sm" />
                  </td>
                  <td className="px-6 py-4 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {el.eligible_count?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono tabular-nums text-slate-500">
                    {new Date(el.closes_at_utc).toISOString().slice(0, 16).replace("T", " ")} UTC
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/officer/elections/${el.id}/lifecycle`}
                      className="min-h-[36px] px-3 py-1 font-bold text-[#157E92] dark:text-[#38BDF8] hover:bg-[#157E92]/10 active:scale-[0.98] rounded-lg transition-all duration-75 ease-out text-xs inline-flex items-center gap-1.5 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92]"
                    >
                      <span>Lifecycle</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
