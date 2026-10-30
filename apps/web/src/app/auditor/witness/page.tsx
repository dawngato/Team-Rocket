"use client";

import React, { useState } from "react";
import { ShieldCheck, CheckCircle2, Download, ArrowRight, RefreshCw, Key } from "lucide-react";
import { INITIAL_ELECTIONS, INITIAL_EVIDENCE, INITIAL_TRUSTED_PINS } from "../../lib/mock_data";

export default function AuditorWitnessPage() {
  const [selectedElectionId, setSelectedElectionId] = useState("elec_cs_2026");
  const [fetching, setFetching] = useState(false);
  const [witnessReport, setWitnessReport] = useState<{
    checkpointDigest: string;
    treeSize: number;
    signatureValid: boolean;
    witnessNode: string;
  } | null>({
    checkpointDigest: "sha256_e4c82b1d09f7a6352410e98a7b6c5d4e3f2a10987654321fedcba09876543210",
    treeSize: 816,
    signatureValid: true,
    witnessNode: "Himachal State Academic Witness Node 1",
  });

  const handleFetch = () => {
    setFetching(true);
    setTimeout(() => {
      setWitnessReport({
        checkpointDigest: "sha256_e4c82b1d09f7a6352410e98a7b6c5d4e3f2a10987654321fedcba09876543210",
        treeSize: 816,
        signatureValid: true,
        witnessNode: "Himachal State Academic Witness Node 1",
      });
      setFetching(false);
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Local Witness Emulator
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Fetch Final Witness Checkpoints
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Inspect the local witness emulator. A separately operated witness must be configured outside this development workspace.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#132135] p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] shadow-sm">
        <div className="flex items-center gap-3">
          <label htmlFor="wit-election" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Election:
          </label>
          <select
            id="wit-election"
            value={selectedElectionId}
            onChange={(e) => setSelectedElectionId(e.target.value)}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
          >
            {INITIAL_ELECTIONS.map((elec) => (
              <option key={elec.id} value={elec.id}>
                {elec.title}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleFetch}
          disabled={fetching}
          className="min-h-[44px] px-5 py-2.5 rounded-lg font-bold text-white bg-[#157E92] hover:bg-[#0E6273] transition-colors flex items-center gap-2 text-sm shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} aria-hidden="true" />
          <span>{fetching ? "Loading Fixture..." : "Load Local Checkpoint Fixture"}</span>
        </button>
      </div>

      {witnessReport && (
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1E3352]">
            <h2 className="font-bold text-lg text-[#10233F] dark:text-white">
              Witness Response Summary
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-[#15805D]/10 text-[#15805D]">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Fixture Signature Checked</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 block font-mono">Signing Authority</span>
              <strong className="text-sm text-[#10233F] dark:text-white">
                {witnessReport.witnessNode}
              </strong>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 block font-mono">Fixture Leaf Count</span>
              <strong className="text-sm text-[#15805D] font-mono">
                {witnessReport.treeSize} ballots
              </strong>
            </div>
            <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-1 font-mono">
              <span className="text-slate-400 block font-sans text-xs">Final Checkpoint Digest</span>
              <span className="text-[#10233F] dark:text-white break-all text-xs font-semibold">
                {witnessReport.checkpointDigest}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
