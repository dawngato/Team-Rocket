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
          <span>Prototype Data Handling</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] dark:text-white">
          Privacy and Data Handling Notice
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Data handling depends on the client, configured services, and deployment. This notice describes the prototype's limits.
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">1. Prototype Status</h2>
          <p className="leading-relaxed">
            HimVote includes local demonstrations and service integrations. This prototype has not established production privacy controls or legal compliance. Review the notice provided by the institution operating any live election.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">2. Identity and Ballot Data</h2>
          <p className="leading-relaxed">
            Identity and ballot separation depends on the credential protocol and the deployed services. Some local demo clients store a student identifier with the selected candidate and do not provide anonymous voting. Do not enter sensitive personal information in a demo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">3. Receipts and Public Evidence</h2>
          <p className="leading-relaxed">
            A receipt or checkpoint is not proof of ballot secrecy or a correct tally by itself. Inclusion checks require a published proof, a trusted root, and a verifier that validates the evidence.
          </p>
        </section>
      </div>
    </div>
  );
}
