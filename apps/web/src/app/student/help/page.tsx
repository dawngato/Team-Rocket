"use client";

import React from "react";
import Link from "next/link";
import { HelpCircle, Shield, EyeOff, Lock, AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function StudentHelpPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <Link
            href="/student"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8] hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Student Hub</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            Voter Assistance
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Voter Rights and Privacy Guide
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Understand how your identity remains unlinked from your ballot and what protections you have.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Core Guarantees */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-[#10233F] dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#15805D]" aria-hidden="true" />
            <span>Cryptographic Privacy Guarantees</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
              <h3 className="font-bold text-sm text-[#10233F] dark:text-white flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-[#157E92]" aria-hidden="true" />
                <span>Blind Credential Issuance</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                When you obtain your voting token, your browser blinds the request per RFC 9474. The university server signs that you are eligible without seeing the credential token itself.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
              <h3 className="font-bold text-sm text-[#10233F] dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#157E92]" aria-hidden="true" />
                <span>Isolated Ballot Origins</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Ballots are cast to a distinct casting service origin that shares no database tables, networks, or session cookies with the student identity database.
              </p>
            </div>
          </div>
        </div>

        {/* Voting Instructions */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-[#10233F] dark:text-white">
            Step by Step Voting Instructions
          </h2>
          <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#157E92] text-white flex items-center justify-center font-bold flex-shrink-0">1</span>
              <div>
                <strong className="text-[#10233F] dark:text-white block">Log in and verify eligibility</strong>
                <span>Ensure your university account shows status VERIFIED in your student portal before the election cutoff time.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#157E92] text-white flex items-center justify-center font-bold flex-shrink-0">2</span>
              <div>
                <strong className="text-[#10233F] dark:text-white block">Request Blind Credential</strong>
                <span>Navigate to the contest and click Request Credential. Your browser saves the unblinded proof in secure local storage.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#157E92] text-white flex items-center justify-center font-bold flex-shrink-0">3</span>
              <div>
                <strong className="text-[#10233F] dark:text-white block">Submit Encrypted Ballot</strong>
                <span>Select your candidate, review choices, and submit. You receive a unique receipt handle like HV_24F8_19C2.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#157E92] text-white flex items-center justify-center font-bold flex-shrink-0">4</span>
              <div>
                <strong className="text-[#10233F] dark:text-white block">Verify Inclusion Offline</strong>
                <span>Visit the Inclusion Verifier to prove your leaf hash is included in the witnessed Merkle checkpoint tree.</span>
              </div>
            </li>
          </ol>
        </div>

        {/* Coercion and Security Notice */}
        <div className="p-6 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
          <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
            <span>Coercion Resistance Notice</span>
          </h3>
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            Your receipt handle proves that a ballot was accepted into the ledger, but it does NOT reveal which candidate you chose. Never disclose your private credential proof to anyone. If you suspect your student account or device was compromised, contact the campus election desk immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
