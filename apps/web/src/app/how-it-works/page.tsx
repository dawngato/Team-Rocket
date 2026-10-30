"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Key,
  Vote,
  Layers,
  Globe,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  Lock,
  EyeOff,
  Database,
  ExternalLink,
} from "lucide-react";

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState<number>(1);

  const verificationStages = [
    {
      step: 1,
      title: "Voter Eligibility and Authorized Credential Flow",
      icon: Key,
      summary: "The architecture strictly separates identity verification from credential issuance.",
      technical:
        "The identity gateway exercises RFC 9474 RSA blind signatures and maintains isolated API boundaries. A certified external election engine and its approved issuance protocol govern live production enrollment.",
      guarantee: "The cryptographic separation is enforced at database and origin boundaries with test coverage.",
    },
    {
      step: 2,
      title: "Isolated Development Casting Flow",
      icon: Vote,
      summary: "The casting service is exercised through a separate origin and database boundary.",
      technical:
        "The local casting service validates development evidence, enforces duplicate constraints and records an append only acceptance path. The external engine gate is not passed.",
      guarantee: "The cryptographic test suite verifies duplicate rejection fail-closed behavior.",
    },
    {
      step: 3,
      title: "Witnessed Merkle Tree Checkpoints",
      icon: Layers,
      summary: "Accepted development records are committed as ordered leaves in an append only hash tree.",
      technical:
        "Ballot evidence is canonicalized and hashed with the repository's documented RFC 9162 style construction. The local witness emulator signs checkpoint records for testing.",
      guarantee: "The verifier detects mutations against the supplied checkpoint. Independent witness operation is not present locally.",
    },
    {
      step: 4,
      title: "Development Checkpoint Anchor",
      icon: Globe,
      summary: "A local chain adapter can record non identifying checkpoint commitments.",
      technical:
        "The development relayer exercises checkpoint sequencing and records confirmation metadata on a local chain profile. No public network finality is claimed.",
      guarantee: "A chain record is supplementary evidence and does not prove voter identity, ballot secrecy, or tally correctness.",
    },
    {
      step: 5,
      title: "Standalone Audit Verification",
      icon: FileCheck,
      summary: "An auditor can run the Python verifier without the application server.",
      technical:
        "The standalone verifier loads trust pins outside the archive, checks canonical evidence, Merkle history, witness data and chain metadata. The current development profile is rejected by the strict command when native engine tally proof is absent.",
      guarantee: "The verifier reports the properties it can check. It does not guarantee a live election or complete privacy.",
    },
    {
      step: 6,
      title: "Published Results and Inclusion Verification",
      icon: ShieldCheck,
      summary: "Results should be published only after the required independent evidence passes.",
      technical:
        "Results are released to the public observer portal with full evidence bundles. Each individual voter can input their receipt handle to verify their personal leaf inclusion proof offline without revealing their selection.",
      guarantee: "A receipt can support inclusion checking without revealing a candidate choice. It does not prove that a compromised client recorded voter intent.",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8]">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          Reference Verification Workflow
        </div>
        <h1 className="text-4xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
          How HimVote Verification Works
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
          This page explains the intended HimVote workflow. This interface displays cryptographic verification steps across manifest, witness, and blockchain audit checkpoints.
        </p>
      </div>

      {/* Interactive Step Carousel / Selector */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {verificationStages.map((stage) => {
            const Icon = stage.icon;
            const isActive = activeStep === stage.step;
            return (
              <button
                key={stage.step}
                type="button"
                onClick={() => setActiveStep(stage.step)}
                className={`min-h-[56px] p-3 rounded-xl border text-left transition-all flex flex-col justify-between focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] ${
                  isActive
                    ? "border-[#157E92] bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] shadow-sm ring-2 ring-[#157E92]"
                    : "border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-slate-700 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold font-mono">Stage {stage.step}</span>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold truncate mt-1">
                  {stage.title.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Stage Detailed Card */}
        {(() => {
          const current = verificationStages[activeStep - 1];
          const Icon = current.icon;
          return (
            <div className="p-8 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#157E92]/10 text-[#157E92] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-7 h-7" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#157E92] dark:text-[#38BDF8]">
                    Protocol Stage {current.step} of 6
                  </span>
                  <h2 className="text-2xl font-bold text-[#10233F] dark:text-white mt-1">
                    {current.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    {current.summary}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-[#1E3352]">
                <div className="p-5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
                    <span>Cryptographic Specification</span>
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {current.technical}
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-[#15805D]/5 border border-[#15805D]/20 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#15805D] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Integrity and Secrecy Guarantee</span>
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {current.guarantee}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Property and Verification Proof Matrix */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden space-y-4 p-6 sm:p-8">
        <div>
          <h2 className="text-xl font-bold text-[#10233F] dark:text-white">
            Security Properties and Verification Criteria
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            HimVote makes zero unqualified claims. Here is how each property is verified.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-[#1E3352]">
              <tr>
                <th scope="col" className="px-4 py-3">Security Property</th>
                <th scope="col" className="px-4 py-3">Proof Mechanism</th>
                <th scope="col" className="px-4 py-3">Independent Verifier Check</th>
                <th scope="col" className="px-4 py-3">Documented Boundary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              <tr>
                <td className="px-4 py-3.5 font-bold text-[#10233F] dark:text-white">Ballot Secrecy</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">RFC 9474 Blind Signatures</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Identity and casting separation audits</td>
                <td className="px-4 py-3 text-slate-500 italic">Does not prevent outside coercion</td>
              </tr>
              <tr>
                <td className="px-4 py-3.5 font-bold text-[#10233F] dark:text-white">One Vote Enforcement</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Deterministic Nullifier Commitments</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Zero duplicate nullifier assertions in log</td>
                <td className="px-4 py-3 text-slate-500 italic">Requires honest cutoff threshold</td>
              </tr>
              <tr>
                <td className="px-4 py-3.5 font-bold text-[#10233F] dark:text-white">Append Only Immutability</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">RFC 9162 Merkle Tree Log</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Hash recomputation matches witness checkpoint</td>
                <td className="px-4 py-3 text-slate-500 italic">Depends on SHA-256 collision resistance</td>
              </tr>
              <tr>
                <td className="px-4 py-3.5 font-bold text-[#10233F] dark:text-white">Chain Finality</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Ethereum Smart Contract Anchor</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Block depth confirmations &gt;= 12 blocks</td>
                <td className="px-4 py-3 text-slate-500 italic">Subject to blockchain liveness</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA Links */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-[#1E3352]">
        <div>
          <h3 className="font-bold text-sm text-[#10233F] dark:text-white">
            Explore Live Audits and Security Boundaries
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            View published evidence packages or review our explicit threat model limitations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/security-limits"
            className="min-h-[44px] px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1E3352] hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <span>Security Limits</span>
          </Link>
          <Link
            href="/audit"
            className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors text-xs flex items-center gap-1.5 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <span>Public Audit Explorer</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
