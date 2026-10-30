"use client";

import React from "react";
import Link from "next/link";
import { StateBadge } from "../../components/StateBadge";
import { INITIAL_ELECTIONS, INITIAL_RESULTS } from "../../lib/mock_data";
import { Award, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

export default function StudentResultsPage() {
  const publishedElectionIds = Object.keys(INITIAL_RESULTS);
  const electionsWithResults = INITIAL_ELECTIONS.filter((e) =>
    publishedElectionIds.includes(e.id)
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <Award className="w-3.5 h-3.5" aria-hidden="true" />
            Certified Campus Outcomes
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Election Results and Attestations
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Official outcomes verified through independent witness checkpoints and cryptographic tallying.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {electionsWithResults.map((elec) => {
          const res = INITIAL_RESULTS[elec.id];
          return (
            <div
              key={elec.id}
              className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <StateBadge state={elec.state} size="sm" />
                  <span className="text-xs font-mono text-slate-500">
                    {res ? `${res.total_ballots} ballots cast` : ""}
                  </span>
                </div>
                <h2 className="font-bold text-lg text-[#10233F] dark:text-white">
                  {elec.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Contest: {elec.contest} | Verified by independent witness nodes
                </p>

                {res && (
                  <div className="pt-2 space-y-2">
                    {Object.entries(res.tally).map(([name, count]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 text-xs font-semibold"
                      >
                        <span className="text-[#10233F] dark:text-white">{name}</span>
                        <span className="font-mono text-[#157E92]">{count} votes</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between">
                <Link
                  href={`/results?election=${elec.id}`}
                  className="text-xs font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
                >
                  <span>Detailed Proof Breakdown</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
                <Link
                  href={`/audit?election=${elec.id}`}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Audit Ledger
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
