"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StateBadge } from "../../../../components/StateBadge";
import { INITIAL_ELECTIONS } from "../../../../lib/mock_data";
import { apiClient } from "../../../../lib/api_client";
import { Vote, ArrowRight, Play, Square, CheckCircle2 } from "lucide-react";

export default function OfficerLifecyclePage() {
  const params = useParams();
  const electionId = params?.id as string;
  const [election, setElection] = useState(
    INITIAL_ELECTIONS.find((e) => e.id === electionId) || INITIAL_ELECTIONS[0]
  );
  const [updating, setUpdating] = useState(false);

  const handleOpen = async () => {
    setUpdating(true);
    const updated = await apiClient.openElection(election.id);
    setElection(updated);
    setUpdating(false);
  };

  const handleClose = async () => {
    setUpdating(true);
    const updated = await apiClient.closeElection(election.id);
    setElection(updated);
    setUpdating(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            Voting Window Controls
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Election Lifecycle Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            {election.title} | Open voting booth gateways and close balloting for tallying.
          </p>
        </div>
        <StateBadge state={election.state} size="md" />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-2">
          <h2 className="font-bold text-lg text-[#10233F] dark:text-white">
            Current Election Status: {election.state}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            State transitions are irreversibly logged across the independent witness network. Opening enables casting origin ingestion. Closing halts ballot acceptance and initiates witness checkpoint finalization.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100 dark:border-[#1E3352]">
          {election.state === "FROZEN" && (
            <button
              type="button"
              disabled={updating}
              onClick={handleOpen}
              className="min-h-[44px] px-6 py-2.5 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              <span>Open Election for Ballot Ingestion</span>
            </button>
          )}

          {election.state === "OPEN" && (
            <button
              type="button"
              disabled={updating}
              onClick={handleClose}
              className="min-h-[44px] px-6 py-2.5 font-bold text-white bg-[#C23C45] hover:bg-[#A32A32] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              <Square className="w-4 h-4" aria-hidden="true" />
              <span>Close Election and Initiate Final Checkpoint</span>
            </button>
          )}

          <Link
            href={`/officer/elections/${election.id}/publication`}
            className="min-h-[44px] px-6 py-2.5 font-bold text-[#10233F] dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ml-auto"
          >
            <span>Proceed to Publication Requests</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
