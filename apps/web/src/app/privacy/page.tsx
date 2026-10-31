import React from "react";
import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#157E92] hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Return to Home</span>
      </Link>

      <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-[#1E2E42]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399]">
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Voter Privacy and DPDPA Alignment</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] dark:text-white">
          Privacy Policy
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Guarantees regarding data collection, zero third-party telemetry, and cryptographic decoupling.
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">1. Zero Third-Party Trackers</h2>
          <p className="leading-relaxed">
            SecureVote does not embed advertising pixels, external analytics trackers, or third-party cookies. All state caching is session-bound or strictly local to the campus gateway.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">2. Dual-Origin Cryptographic Decoupling</h2>
          <p className="leading-relaxed">
            The voter identity issuer knows who you are, but receives a blinded credential hash and never learns your ballot selections. The casting gateway receives your unblinded token and encrypted vote, but never learns your institutional identity or roll number.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">3. Receipt Invariants</h2>
          <p className="leading-relaxed">
            Your receipt handle (e.g. HV_24F8_19C2) proves Merkle tree inclusion in the published checkpoint without recording candidate selections, eliminating vote buying and receipt-based coercion.
          </p>
        </section>
      </div>
    </div>
  );
}
