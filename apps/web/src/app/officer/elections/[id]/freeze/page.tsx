"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StateBadge } from "../../../../components/StateBadge";
import { INITIAL_ELECTIONS } from "../../../../lib/mock_data";
import { apiClient } from "../../../../lib/api_client";
import { FileLock2, CheckCircle2, ArrowRight, ShieldCheck, Lock } from "lucide-react";

export default function OfficerFreezeManifestPage() {
  const params = useParams();
  const electionId = params?.id as string;
  const [election, setElection] = useState(
    INITIAL_ELECTIONS.find((e) => e.id === electionId) || INITIAL_ELECTIONS[0]
  );
  const [freezing, setFreezing] = useState(false);
  const isFrozen = election.state !== "DRAFT";

  const handleFreeze = async () => {
    setFreezing(true);
    const updated = await apiClient.freezeElection(election.id);
    setElection(updated);
    setFreezing(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#AA6C0B]/10 text-[#AA6C0B] mb-1">
            <FileLock2 className="w-3.5 h-3.5" aria-hidden="true" />
            Immutability Milestone
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Freeze Election Manifest
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            {election.title} | Lock candidate options, voter roster digest, and parameters.
          </p>
        </div>
        <StateBadge state={election.state} size="md" />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-3">
          <h2 className="font-bold text-lg text-[#10233F] dark:text-white">
            Manifest Digest Lock
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Freezing the manifest establishes the canonical SHA256 digest against which every client and external witness verifier checks the election specification. Once frozen, candidate additions or roster edits are permanently rejected.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-[#1E3352] space-y-2 text-xs font-mono">
          <span className="text-slate-400 font-sans block text-[11px] uppercase tracking-wider">
            Canonical Manifest SHA256 Digest
          </span>
          <span className="text-[#10233F] dark:text-white font-bold break-all block">
            {election.manifest_digest}
          </span>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-[#1E3352]">
          {isFrozen ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-[#15805D]">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span>Manifest is frozen and registered on the immutable ledger.</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={freezing}
              onClick={handleFreeze}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 font-bold text-white bg-[#AA6C0B] hover:bg-[#8D5808] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AA6C0B]"
            >
              <Lock className="w-4 h-4" aria-hidden="true" />
              <span>{freezing ? "Locking Manifest..." : "Freeze and Lock Manifest"}</span>
            </button>
          )}

          <Link
            href={`/officer/elections/${election.id}/lifecycle`}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <span>Next: Election Lifecycle Controls</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
