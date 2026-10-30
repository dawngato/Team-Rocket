"use client";

import React, { useState } from "react";
import { Blocks, CheckCircle2, RefreshCw, ExternalLink } from "lucide-react";
import { INITIAL_ELECTIONS, INITIAL_EVIDENCE } from "@/lib/mock_data";
import { Election } from "@/lib/types";

export default function AuditorChainAnchorPage() {
  const [selectedElectionId, setSelectedElectionId] = useState("elec_cs_2026");
  const [querying, setQuerying] = useState(false);

  const evidence = INITIAL_EVIDENCE[selectedElectionId];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <Blocks className="w-3.5 h-3.5" aria-hidden="true" />
            Public Chain Ledger
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Verify Chain Anchor Finality
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Verify transaction receipts on the public blockchain to ensure permanent immutability.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white dark:bg-[#132135] p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] shadow-sm">
        <label htmlFor="chain-elec-select" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
          Target Contest:
        </label>
        <select
          id="chain-elec-select"
          value={selectedElectionId}
          onChange={(e) => setSelectedElectionId(e.target.value)}
          className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
        >
          {INITIAL_ELECTIONS.map((elec: Election) => (
            <option key={elec.id} value={elec.id}>
              {elec.title}
            </option>
          ))}
        </select>
      </div>

      {evidence && evidence.anchor_tx_hash ? (
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1E3352]">
            <h2 className="font-bold text-lg text-[#10233F] dark:text-white">
              EVM Finality Confirmation
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-[#15805D]/10 text-[#15805D]">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Finality Confirmed</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 block font-sans">Anchor Contract Address</span>
              <span className="text-[#10233F] dark:text-white break-all">
                0x157E92A0bC8eD48625EAfA59d04221c97B28a994
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 block font-sans">Block Confirmation Number</span>
              <span className="text-[#15805D] font-bold">
                Block #{evidence.block_number || 19842103} (64+ confirmations)
              </span>
            </div>
            <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 block font-sans">Transaction Hash</span>
              <span className="text-[#157E92] break-all">
                {evidence.anchor_tx_hash}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-center text-slate-500 text-xs">
          No chain anchor recorded yet for this election. Anchor relay executes following election close and witness cosigning.
        </div>
      )}
    </div>
  );
}
