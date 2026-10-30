"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { INITIAL_ELECTIONS } from "../../../../lib/mock_data";
import { StateBadge } from "../../../../components/StateBadge";
import { ArrowRight, UserCheck, KeyRound, Award, Vote } from "lucide-react";

export default function CandidateReviewPage() {
  const params = useParams();
  const electionId = params?.id as string;
  const election = INITIAL_ELECTIONS.find((e) => e.id === electionId) || INITIAL_ELECTIONS[0];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            Candidate Review Desk
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            {election.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Position: {election.contest || "Executive Council"} | Rule: {election.selection_rule || "Plurality voting"}
          </p>
        </div>
        <StateBadge state={election.state} size="md" />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#10233F] dark:text-white">
          Manifest Candidates
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          The candidate list is locked in the election manifest. No modifications can occur during the voting window.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {election.candidates && election.candidates.length > 0 ? (
            election.candidates.map((cand) => (
              <div
                key={cand.id}
                className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#157E92]/10 text-[#157E92] flex items-center justify-center font-bold text-base">
                      {cand.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-[#10233F] dark:text-white">
                        {cand.name}
                      </h3>
                      <span className="text-xs text-slate-500 font-mono">
                        {cand.contest}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    {cand.statement || "Candidate platform statement supplied for manifest review."}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-8 text-slate-500 text-sm">
              No individual candidates registered for this contest.
            </div>
          )}
        </div>
      </div>

      {/* Action Footer to Get Credential */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-gradient-to-r from-slate-50 to-white dark:from-[#132135] dark:to-[#1A3258] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-bold text-base text-[#10233F] dark:text-white">
            Ready to cast your confidential ballot?
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Request an anonymous blind credential token before submitting your vote to the booth.
          </p>
        </div>

        <Link
          href={`/student/elections/${election.id}/credential`}
          className="min-h-[44px] px-6 py-2.5 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
        >
          <KeyRound className="w-4 h-4" aria-hidden="true" />
          <span>Request Blind Credential</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
