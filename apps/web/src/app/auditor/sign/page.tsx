"use client";

import React, { useState } from "react";
import Link from "next/link";
import { StateBadge } from "../../components/StateBadge";
import { INITIAL_ELECTIONS } from "../../lib/mock_data";
import { ShieldCheck, CheckCircle2, Key, ArrowRight, FileCheck } from "lucide-react";

export default function AuditorSignReportPage() {
  const [selectedElectionId, setSelectedElectionId] = useState("elec_cs_2026");
  const [auditorKey, setAuditorKey] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [signingMessage, setSigningMessage] = useState<string | null>(null);
  const [signedAttestation, setSignedAttestation] = useState<{
    signature: string;
    timestamp: string;
    attestationHash: string;
  } | null>(null);

  const election = INITIAL_ELECTIONS.find((e) => e.id === selectedElectionId) || INITIAL_ELECTIONS[1];

  const handleSign = () => {
    setIsSigning(false);
    setSigningMessage(
      "Signing is disabled in the local prototype. Use the standalone verifier and an auditor controlled key or hardware token outside this application."
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <Key className="w-3.5 h-3.5" aria-hidden="true" />
            Client Side Auditor Signing
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Sign Auditor Attestation Report
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            This prototype does not create auditor signatures. An external auditor must use a separately controlled key or hardware token.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="sign-elec" className="block text-xs font-bold text-[#10233F] dark:text-white mb-1">
              Select Evidence Package
            </label>
            <select
              id="sign-elec"
              value={selectedElectionId}
              onChange={(e) => {
                setSelectedElectionId(e.target.value);
                setSignedAttestation(null);
                setSigningMessage(null);
              }}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            >
              {INITIAL_ELECTIONS.map((elec) => (
                <option key={elec.id} value={elec.id}>
                  {elec.title}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-[#1E3352] space-y-2 text-xs">
            <span className="font-bold text-[#10233F] dark:text-white block">
              Attestation Statement Formulation
            </span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic">
              "I have independently reviewed the evidence archive for {election.title}. The final statement must be written and signed by the external auditor after the standalone verifier completes."
            </p>
          </div>

          <div>
            <label htmlFor="auditor-key" className="block text-xs font-bold text-[#10233F] dark:text-white mb-1">
              Local Signing Key or Hardware Token Identifier
            </label>
            <input
              id="auditor-key"
              type="text"
              required
              value={auditorKey}
              onChange={(e) => setAuditorKey(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg font-mono text-xs border border-slate-300 dark:border-[#1E3352] bg-transparent focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              This field is a reference only. Private keys are not accepted, generated, or stored by this prototype.
            </span>
          </div>

          {signedAttestation ? (
            <div className="p-5 rounded-xl bg-[#15805D]/10 border border-[#15805D]/40 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-[#15805D] font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span>Attestation Signed and Published (AUDITOR_ATTESTED)</span>
              </div>
              <div className="text-xs font-mono text-slate-700 dark:text-slate-300 space-y-1">
                <div>
                  <span className="text-slate-500 font-sans block text-[11px]">Signature:</span>
                  <span className="break-all">{signedAttestation.signature}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans block text-[11px]">Timestamp:</span>
                  <span>{new Date(signedAttestation.timestamp).toLocaleString()}</span>
                </div>
              </div>
              <div className="pt-2">
                <StateBadge state="AUDITOR_ATTESTED" size="md" showDescription />
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled
              className="w-full min-h-[44px] px-6 py-2.5 font-bold text-white bg-[#15805D] hover:bg-[#10664A] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#15805D]"
            >
              <FileCheck className="w-4 h-4" aria-hidden="true" />
              <span>Signing Unavailable in Local Prototype</span>
            </button>
          )}

          {signingMessage && (
            <div role="status" className="p-4 rounded-xl bg-[#AA6C0B]/10 border border-[#AA6C0B]/30 text-xs text-[#6B4707] dark:text-[#FBBF24]">
              {signingMessage}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] flex justify-between items-center text-xs">
            <Link
              href="/audit"
              className="font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
            >
              <span>Back to Audit Explorer</span>
            </Link>
            <Link
              href="/results"
              className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              View Published Results
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
