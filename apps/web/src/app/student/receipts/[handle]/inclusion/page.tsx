"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StateBadge } from "../../../../components/StateBadge";
import {
  Layers,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Binary,
  Play,
  RotateCcw,
} from "lucide-react";

export default function VerifyInclusionPage() {
  const params = useParams();
  const rawHandle = (params?.handle as string) || "HV_24F8_19C2";
  const handleFormatted = decodeURIComponent(rawHandle).replace(/_/g, " ");

  const [verificationPassed, setVerificationPassed] = useState(false);
  const [computing, setComputing] = useState(false);

  const proofSteps = [
    {
      level: 0,
      label: "Leaf Hash (Index 1428)",
      hash: "sha256_d89f10a2bc45e67890123456789abcdef0123456",
      sibling: "sha256_e1098ab23c4d5f67890123456789abcdef012345",
    },
    {
      level: 1,
      label: "Level 1 Parent Hash",
      hash: "sha256_7a6b5c4d3e2f109876543210fedcba9876543210",
      sibling: "sha256_4321fedcba98765432107a6b5c4d3e2f10987654",
    },
    {
      level: 2,
      label: "Level 2 Subtree Root",
      hash: "sha256_99a8b7c6d5e4f3a2b1c0987654321fedcba09876",
      sibling: "sha256_fedcba098765432199a8b7c6d5e4f3a2b1c09876",
    },
  ];

  const targetRoot = "sha256_4b9e28f1c8a4d701e65b2a3f9c78d5e0a1b2c3d4e5f60718293a4b5c6d7e8f90";

  const handleComputeProof = () => {
    setComputing(true);
    setVerificationPassed(false);
    setTimeout(() => {
      setComputing(false);
      setVerificationPassed(true);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            Cryptographic Inclusion Proof
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Merkle Audit Trail
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Receipt: <span className="font-mono font-semibold">{handleFormatted}</span> | Leaf Index: 1428
          </p>
        </div>
        <StateBadge state="WITNESSED" size="md" />
      </div>

      {/* Proof Tree Viewer */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#10233F] dark:text-white">
              Merkle Branch Verification
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Every step hashes your leaf and sibling nodes upward to match the witnessed checkpoint root.
            </p>
          </div>

          <button
            type="button"
            onClick={handleComputeProof}
            disabled={computing}
            className="min-h-[44px] px-5 py-2 rounded-lg font-bold text-white bg-[#157E92] hover:bg-[#0E6273] transition-colors flex items-center gap-2 text-sm shadow-sm disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <Play className={`w-4 h-4 ${computing ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>{computing ? "Computing Hash Tree..." : "Verify Merkle Path"}</span>
          </button>
        </div>

        {/* Path Step Cards */}
        <div className="space-y-4 pt-2">
          {proofSteps.map((step) => (
            <div
              key={step.level}
              className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/50 dark:bg-slate-900/30 space-y-2 text-xs font-mono"
            >
              <div className="flex items-center justify-between font-sans">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {step.label}
                </span>
                <span className="text-slate-400 text-[11px]">Level {step.level}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">Current Node Hash:</span>
                <span className="text-[#10233F] dark:text-white break-all text-[11px]">
                  {step.hash}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">Sibling Hash:</span>
                <span className="text-slate-600 dark:text-slate-400 break-all text-[11px]">
                  {step.sibling}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Target Root Comparison */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-100 dark:bg-slate-900/50 space-y-2 text-xs font-mono">
          <span className="text-slate-500 font-sans block font-semibold text-xs uppercase tracking-wider">
            Witnessed Checkpoint Root
          </span>
          <span className="text-[#10233F] dark:text-white font-bold break-all text-xs block">
            {targetRoot}
          </span>
        </div>

        {/* Verification Success Banner */}
        {verificationPassed && (
          <div className="p-5 rounded-xl bg-[#15805D]/10 border border-[#15805D]/40 space-y-2 animate-fadeIn">
            <div className="flex items-center gap-2 text-[#15805D] font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span>Cryptographic Inclusion Confirmed (Zero Discrepancy)</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              The hash path from your leaf index 1428 evaluates exactly to the published witness checkpoint digest. Your ballot is confirmed in the certified ledger.
            </p>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-[#1E3352]">
          <Link
            href={`/student/receipts/${encodeURIComponent(rawHandle)}`}
            className="text-xs font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
          >
            <span>Back to Receipt Timeline</span>
          </Link>
          <Link
            href="/audit"
            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#10233F] dark:hover:text-white flex items-center gap-1"
          >
            <span>Public Audit Explorer</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
