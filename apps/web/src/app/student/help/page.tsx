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
            Student Voting and Privacy Guide
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Review the intended voting flow and the limits of the protections available in this prototype.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Privacy and security notes */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-[#10233F] dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#15805D]" aria-hidden="true" />
            <span>Privacy and Security Notes</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
              <h3 className="font-bold text-sm text-[#10233F] dark:text-white flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-[#157E92]" aria-hidden="true" />
                <span>Credential Issuance</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                The intended design uses blind credentials to separate eligibility checks from ballot use. The current prototype does not establish RFC 9474 unlinkability in every client or deployment.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
              <h3 className="font-bold text-sm text-[#10233F] dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#157E92]" aria-hidden="true" />
                <span>Service Boundaries</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Identity and casting services have separate roles, but shared infrastructure, operators, and timing data can still create links. Deployment controls determine what separation is active.
              </p>
            </div>
          </div>
        </div>

        {/* Voting Instructions */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-[#10233F] dark:text-white">
            Voting Steps
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
                <strong className="text-[#10233F] dark:text-white block">Request a voting credential</strong>
                <span>Follow the election page instructions. Credential issuance and local storage depend on the client and deployment configuration.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#157E92] text-white flex items-center justify-center font-bold flex-shrink-0">3</span>
              <div>
                <strong className="text-[#10233F] dark:text-white block">Submit your ballot</strong>
                <span>Review your selection before submitting. If the casting service accepts the ballot, it may return a receipt handle.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#157E92] text-white flex items-center justify-center font-bold flex-shrink-0">4</span>
              <div>
                <strong className="text-[#10233F] dark:text-white block">Check ballot inclusion</strong>
                <span>An inclusion check requires a published proof and root. It does not authenticate the root or verify the final tally.</span>
              </div>
            </li>
          </ol>
        </div>

        {/* Coercion and Security Notice */}
        <div className="p-6 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
          <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
            <span>Privacy and Device Safety</span>
          </h3>
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            A receipt handle reports that the casting service accepted a ballot record. It does not prove ballot secrecy, inclusion in the final tally, or resistance to coercion. Do not share your credentials. Contact the campus election desk if your account or device may be compromised.
          </p>
        </div>
      </div>
    </div>
  );
}
