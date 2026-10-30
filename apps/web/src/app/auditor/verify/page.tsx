"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Play, CheckCircle2, AlertTriangle, ArrowRight, Download, FileText } from "lucide-react";
import { INITIAL_ELECTIONS, INITIAL_RESULTS, INITIAL_EVIDENCE } from "../../lib/mock_data";

interface VerificationCheck {
  id: string;
  property: string;
  outcome: "PASS" | "FAIL" | "LIMITED" | "ASSUMED";
  detail: string;
}

export default function AuditorVerifySuitePage() {
  const [selectedElectionId, setSelectedElectionId] = useState("elec_cs_2026");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<VerificationCheck[] | null>(null);

  const election = INITIAL_ELECTIONS.find((e) => e.id === selectedElectionId) || INITIAL_ELECTIONS[1];
  const published = INITIAL_RESULTS[selectedElectionId];
  const evidence = INITIAL_EVIDENCE[selectedElectionId];

  const handleRunVerification = () => {
    setIsRunning(true);
    setResults(null);
    setTimeout(() => {
      setIsRunning(false);
      setResults([
        {
          id: "CHK_01",
          property: "Manifest Digest Verification",
          outcome: "LIMITED",
          detail: "Fixture comparison is shown for verification reference. The standalone verifier must recompute this from an imported archive.",
        },
        {
          id: "CHK_02",
          property: "Witness Signature Verification",
          outcome: "LIMITED",
          detail: "The local preview contains witness shaped data. Independent operator custody is not established.",
        },
        {
          id: "CHK_03",
          property: "Merkle Tree Consistency",
          outcome: "LIMITED",
          detail: "The preview displays a fixture leaf count. Run the offline verifier to check an actual archive.",
        },
        {
          id: "CHK_04",
          property: "Tally Equivalence Check",
          outcome: "LIMITED",
          detail: "The development profile does not provide a native encrypted tally proof.",
        },
        {
          id: "CHK_05",
          property: "Chain Anchor Finality Depth",
          outcome: "LIMITED",
          detail: "The local chain adapter operates in development mode and requires external consortium confirmation.",
        },
      ]);
    }, 1200);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Development Verifier Preview
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Offline Audit Verification Suite
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Review the fixture workflow before running the standalone Python verifier with separately supplied trust pins.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#132135] p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] shadow-sm">
        <div className="flex items-center gap-3">
          <label htmlFor="ver-elec" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Verification Target:
          </label>
          <select
            id="ver-elec"
            value={selectedElectionId}
            onChange={(e) => {
              setSelectedElectionId(e.target.value);
              setResults(null);
            }}
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
          onClick={handleRunVerification}
          disabled={isRunning}
          className="min-h-[44px] px-6 py-2.5 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm disabled:opacity-60"
        >
          <Play className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} aria-hidden="true" />
          <span>{isRunning ? "Verifying Proofs..." : "Execute Full Verification"}</span>
        </button>
      </div>

      {/* Side by side root and tally comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-3">
          <span className="text-xs font-mono uppercase text-slate-400 block">Root Comparison</span>
          <div className="space-y-2 text-xs font-mono">
            <div>
              <span className="text-slate-400 block font-sans">Published Checkpoint Root:</span>
              <span className="text-[#10233F] dark:text-white font-semibold break-all">
                {evidence?.final_checkpoint_digest || "Pending election close"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-sans">Locally Computed Root:</span>
          <span className="text-[#AA6C0B] font-semibold break-all">
                {evidence?.final_checkpoint_digest || "Pending election close"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-3">
          <span className="text-xs font-mono uppercase text-slate-400 block">Tally Comparison</span>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-600 dark:text-slate-400">Published Total Ballots:</span>
              <span className="font-mono text-[#10233F] dark:text-white">
                {published?.total_ballots || 0}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-600 dark:text-slate-400">Recomputed Valid Ballots:</span>
              <span className="font-mono text-[#AA6C0B]">
                {published?.total_ballots || 0}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-600 dark:text-slate-400">Discrepancy:</span>
              <span className="font-mono text-[#AA6C0B]">Fixture comparison only</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Checklist */}
      {results && (
        <div className="rounded-xl border border-[#15805D]/30 bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1E3352]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-[#AA6C0B]" aria-hidden="true" />
              <h2 className="text-xl font-bold text-[#10233F] dark:text-white">
                Verification Ledger Output
              </h2>
            </div>
            <Link
              href="/auditor/sign"
              className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#15805D] hover:bg-[#10664A] rounded-lg transition-colors flex items-center gap-2 text-xs shadow-sm"
            >
              <span>Sign Auditor Attestation</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="space-y-3">
            {results.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-lg border border-slate-200 dark:border-[#1E3352] bg-slate-50 dark:bg-slate-900/40 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-[#10233F] dark:text-white">{c.property}</strong>
              <span className="font-mono font-bold text-xs bg-[#AA6C0B]/10 text-[#AA6C0B] px-2 py-0.5 rounded">
                    {c.outcome}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">{c.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
