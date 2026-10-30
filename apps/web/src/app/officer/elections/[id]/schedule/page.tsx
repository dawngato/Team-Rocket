"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StateBadge } from "../../../../components/StateBadge";
import { INITIAL_ELECTIONS } from "../../../../lib/mock_data";
import { Calendar, Clock, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function OfficerSchedulePage() {
  const params = useParams();
  const electionId = params?.id as string;
  const election = INITIAL_ELECTIONS.find((e) => e.id === electionId) || INITIAL_ELECTIONS[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            Timeline Authority
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Election Schedule and Cutoffs
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            {election.title} | Strict timing guarantees privacy separation.
          </p>
        </div>
        <StateBadge state={election.state} size="md" />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50 dark:bg-slate-900/40 flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#AA6C0B] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <strong className="text-sm text-[#10233F] dark:text-white block">
                Section 10 Protocol Timing Rule
              </strong>
              <p>
                Credential issuance cutoff occurs prior to the opening of casting. This architectural restriction breaks network timing correlation between student credential requests and ballot submissions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] space-y-1">
              <span className="text-xs text-slate-400 block font-mono">1. Issuance Cutoff</span>
              <strong className="text-sm text-[#10233F] dark:text-white block">
                {new Date(election.issuance_cutoff_utc).toLocaleString()}
              </strong>
              <span className="text-[11px] text-[#AA6C0B] font-semibold">Registration Ends</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] space-y-1">
              <span className="text-xs text-slate-400 block font-mono">2. Voting Booth Opens</span>
              <strong className="text-sm text-[#10233F] dark:text-white block">
                {new Date(election.opens_at_utc).toLocaleString()}
              </strong>
              <span className="text-[11px] text-[#157E92] font-semibold">Casting Active</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] space-y-1">
              <span className="text-xs text-slate-400 block font-mono">3. Voting Closes</span>
              <strong className="text-sm text-[#10233F] dark:text-white block">
                {new Date(election.closes_at_utc).toLocaleString()}
              </strong>
              <span className="text-[11px] text-[#15805D] font-semibold">Tally Finalization</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] flex justify-end">
          <Link
            href={`/officer/elections/${election.id}/freeze`}
            className="min-h-[44px] px-6 py-2.5 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <span>Next: Freeze Election Manifest</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
