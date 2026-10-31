import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white">
          <ShieldCheck className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
          <span>Institutional Policy</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] dark:text-white">
          Terms of Service
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Effective Date: October 2026. Governing institutional campus voting and verification protocols.
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">1. Authorized Participation</h2>
          <p className="leading-relaxed">
            Access to ballot casting is restricted to eligible students and faculty with verified campus roster records. Automated scraping, vote submission replay attacks, and denial-of-service attempts against identity or casting gateways are strictly prohibited and audited.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">2. Anonymity and Secrecy Guarantee</h2>
          <p className="leading-relaxed">
            The platform architecture enforces cryptographic separation between student identity tokens and ballot commitments via blind signature protocols. No administrative role or faculty verifier can correlate individual voting selections with student identity.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">3. Public Audit Explorer Usage</h2>
          <p className="leading-relaxed">
            Witness signatures, Merkle checkpoint trees, and blockchain anchor transaction digests are published for public independent verification. Observers may reproduce proofs offline using standard cryptographic verification tools.
          </p>
        </section>
      </div>
    </div>
  );
}
