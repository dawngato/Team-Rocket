"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { INITIAL_ELECTIONS } from "../../../../lib/mock_data";
import { StateBadge } from "../../../../components/StateBadge";
import { KeyRound, ShieldCheck, CheckCircle2, ArrowRight, Lock, Sparkles } from "lucide-react";

export default function GetCredentialPage() {
  const params = useParams();
  const router = useRouter();
  const electionId = params?.id as string;
  const election = INITIAL_ELECTIONS.find((e) => e.id === electionId) || INITIAL_ELECTIONS[0];

  const [step, setStep] = useState<"READY" | "BLINDING" | "ISSUED">("READY");
  const [blindToken, setBlindToken] = useState("");

  const handleGenerateCredential = () => {
    setStep("BLINDING");
    setTimeout(() => {
      setBlindToken("blind_sig_rsa4096_pss_" + Math.random().toString(36).substring(2, 12));
      setStep("ISSUED");
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-[#157E92] text-white flex items-center justify-center mx-auto shadow-md">
          <KeyRound className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-[#10233F] dark:text-white">
          Anonymous Credential Issuance
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Target Contest: {election.title}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1E3352]">
            <span className="font-bold text-sm text-[#10233F] dark:text-white">
              Cryptographic Blind Signature Protocol
            </span>
            <StateBadge state={election.state} size="sm" />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Your browser creates a random blinding factor locally. The university identity server signs the blinded value to verify your eligibility on the roster, but mathematical blinding prevents the identity server from associating your real name with the ballot you will cast.
          </p>
        </div>

        {step === "READY" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                <Lock className="w-4 h-4 text-[#157E92]" aria-hidden="true" />
                <span>Eligibility Status Confirmed</span>
              </div>
              <p className="text-slate-500">
                Institutional student ID confirmed on department voter roster. Single spend nullifier slot reserved.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateCredential}
              className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Generate Blind Token and Request Signature</span>
            </button>
          </div>
        )}

        {step === "BLINDING" && (
          <div className="py-8 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-[#157E92] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
              Generating local blinding factor and negotiating RSA Blind Signature with identity origin...
            </p>
          </div>
        )}

        {step === "ISSUED" && (
          <div className="space-y-5 animate-fadeIn">
            <div className="p-4 rounded-lg bg-[#15805D]/10 border border-[#15805D]/30 space-y-2">
              <div className="flex items-center gap-2 text-[#15805D] font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                <span>Anonymous Voting Credential Issued</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Unblinded signature verified successfully. The casting gateway will accept this token without knowing your identity.
              </p>
              <div className="pt-2 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all bg-white dark:bg-[#132135] p-2 rounded border border-slate-200 dark:border-slate-700">
                {blindToken}
              </div>
            </div>

            <Link
              href={`/student/elections/${election.id}/cast`}
              className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
            >
              <span>Proceed to Voting Booth</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
