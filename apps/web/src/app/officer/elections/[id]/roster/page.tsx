"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StateBadge } from "../../../../components/StateBadge";
import { INITIAL_ELECTIONS, INITIAL_STUDENTS } from "../../../../lib/mock_data";
import { Users, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";

export default function OfficerRosterReviewPage() {
  const params = useParams();
  const electionId = params?.id as string;
  const election = INITIAL_ELECTIONS.find((e) => e.id === electionId) || INITIAL_ELECTIONS[0];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            Pre Freeze Verification
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Election Roster Review
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            {election.title} | Confirm voter eligibility and deduplication before locking the manifest.
          </p>
        </div>
        <StateBadge state={election.state} size="md" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Eligible Voters</span>
          <strong className="text-2xl text-[#10233F] dark:text-white font-mono">
            {election.eligible_count || 500}
          </strong>
        </div>
        <div className="p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Deduplication Invariant</span>
          <strong className="text-2xl text-[#15805D] font-mono">Unique IDs</strong>
        </div>
        <div className="p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Minimum Anonymity Gate</span>
          <strong className="text-2xl text-[#157E92] font-mono">
            {election.min_anonymous_turnout || 25} votes
          </strong>
        </div>
      </div>

      {/* Verification checklist */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-base text-[#10233F] dark:text-white">
          Integrity Gate Checklist
        </h2>
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30">
            <CheckCircle2 className="w-4 h-4 text-[#15805D] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <strong>Registrar Roll Synchronized:</strong> Student enrollment verified against university records. Zero unresolved departmental disputes.
            </p>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30">
            <CheckCircle2 className="w-4 h-4 text-[#15805D] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <strong>Nullifier Slot Initialization:</strong> Unique cryptographic slots pre calculated for blind token authorization.
            </p>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30">
            <CheckCircle2 className="w-4 h-4 text-[#15805D] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <strong>Candidate Association Check:</strong> All registered candidates appear on the official contestant manifest.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] flex justify-end">
          <Link
            href={`/officer/elections/${election.id}/schedule`}
            className="min-h-[44px] px-6 py-2.5 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <span>Next: Review Election Schedule</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
