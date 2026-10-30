"use client";

import React from "react";
import Link from "next/link";
import { Award, Plus, Calendar, Lock, CheckCircle2, ArrowRight, ShieldCheck, Users } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { INITIAL_ELECTIONS } from "@/lib/mock_data";

export default function OfficerOverviewPage() {
  const activeElections = INITIAL_ELECTIONS.filter((e) => e.state === "OPEN" || e.state === "FROZEN");
  const draftElections = INITIAL_ELECTIONS.filter((e) => e.state === "DRAFT");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            <Award className="w-3.5 h-3.5" aria-hidden="true" />
            Election Administration
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Election Officer Desk
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Build manifests, lock voter rosters, control voting windows, and request evidence based publication review.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/officer/elections"
            className="min-h-[44px] px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1E3352] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <span>My Elections</span>
          </Link>
          <Link
            href="/officer/create"
            className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Create New Election</span>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">Active Contests</span>
          <div className="text-3xl font-extrabold text-[#157E92]">{activeElections.length}</div>
          <span className="text-xs text-slate-500">Currently accepting ballots or frozen</span>
        </div>
        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">Draft Contests</span>
          <div className="text-3xl font-extrabold text-[#AA6C0B]">{draftElections.length}</div>
          <span className="text-xs text-slate-500">Rosters or candidate lists in progress</span>
        </div>
        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">Total Governed Elections</span>
          <div className="text-3xl font-extrabold text-[#10233F] dark:text-white">{INITIAL_ELECTIONS.length}</div>
          <span className="text-xs text-slate-500">Complete institutional lifecycle</span>
        </div>
      </div>

      {/* Quick Action Workspaces */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#10233F] dark:text-white">
          Election Management Lifecycle
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/officer/elections"
            className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#157E92] transition-colors flex flex-col justify-between space-y-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-[#157E92]/10 text-[#157E92] flex items-center justify-center">
                <Award className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-base text-[#10233F] dark:text-white">All Assigned Elections</h3>
              <p className="text-xs text-slate-500">View and manage full election portfolio with live status badges.</p>
            </div>
            <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#157E92]">
              <span>Open List</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </div>
          </Link>

          <Link
            href="/officer/create"
            className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#157E92] transition-colors flex flex-col justify-between space-y-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-[#15805D]/10 text-[#15805D] flex items-center justify-center">
                <Plus className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-base text-[#10233F] dark:text-white">Create Election Draft</h3>
              <p className="text-xs text-slate-500">Define election title, contest rules, candidate slots, and UTC cutoff windows.</p>
            </div>
            <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#15805D]">
              <span>New Contest</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </div>
          </Link>

          <Link
            href="/officer/elections/elec_cs_2026/freeze"
            className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#157E92] transition-colors flex flex-col justify-between space-y-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-[#AA6C0B]/10 text-[#AA6C0B] flex items-center justify-center">
                <Lock className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-base text-[#10233F] dark:text-white">Freeze Manifest Tool</h3>
              <p className="text-xs text-slate-500">Lock manifest digest into immutable RFC 8785 JSON representation.</p>
            </div>
            <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#AA6C0B]">
              <span>Manifest Locker</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </div>
          </Link>
        </div>
      </div>

      {/* Active Contests Table Preview */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1E3352] flex items-center justify-between">
          <h2 className="font-bold text-base text-[#10233F] dark:text-white">
            Monitored Contests
          </h2>
          <Link href="/officer/elections" className="text-xs font-bold text-[#157E92] hover:underline">
            View All
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
                <th scope="col" className="px-6 py-3">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {INITIAL_ELECTIONS.slice(0, 4).map((el) => (
                <tr key={el.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="px-6 py-4">
                    <div className="font-bold text-[#10233F] dark:text-white">{el.title}</div>
                    <div className="text-xs text-slate-400 font-mono">{el.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <StateBadge state={el.state} size="sm" />
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                    {el.eligible_count?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">
                    {new Date(el.closes_at_utc).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/officer/elections/${el.id}/lifecycle`}
                      className="text-xs font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Lifecycle Controls</span>
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
