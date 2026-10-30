"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StateBadge } from "../../../../components/StateBadge";
import { INITIAL_ELECTIONS } from "../../../../lib/mock_data";
import { apiClient } from "../../../../lib/api_client";
import { Send, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";

export default function OfficerPublicationRequestPage() {
  const params = useParams();
  const electionId = params?.id as string;
  const [election, setElection] = useState(
    INITIAL_ELECTIONS.find((e) => e.id === electionId) || INITIAL_ELECTIONS[0]
  );
  const [requested, setRequested] = useState(false);

  const handleRequestPublication = async () => {
    setRequested(true);
    const updated = await apiClient.requestPublication(election.id);
    setElection(updated);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            Publication Certification
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Official Result Publication Request
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            {election.title} | Transmit final checkpoint tally package to witness network.
          </p>
        </div>
        <StateBadge state={election.state} size="md" />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-3">
          <h2 className="font-bold text-lg text-[#10233F] dark:text-white">
            Formal Publication Submission
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Submitting a publication request packages the encrypted ballots, Merkle leaves, and preliminary tally. Independent auditor attestations and external witness signatures will be gathered before the results become certified public records.
          </p>
        </div>

        {requested ? (
          <div className="p-5 rounded-xl bg-[#15805D]/10 border border-[#15805D]/30 space-y-2">
            <div className="flex items-center gap-2 text-[#15805D] font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span>Publication Request Successfully Delivered</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              The tally has been forwarded to the independent auditor console. Checkpoints are queued for final witness signatures.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleRequestPublication}
            className="min-h-[44px] px-6 py-2.5 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>Transmit Publication Request</span>
          </button>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] flex justify-end">
          <Link
            href="/results"
            className="min-h-[44px] px-6 py-2.5 font-bold text-[#10233F] dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <span>View Public Results Page</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
