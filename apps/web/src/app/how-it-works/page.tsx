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
      title: "Voter Eligibility and Blind Credential Issuance",
      icon: Key,
      summary: "Identity registration confirmed against university enrollment sources with blind token derivation.",
      technical:
        "Your browser generates a high entropy secret and blinds it using RSA Blind Signatures per RFC 9474. The central registrar verifies that you are an enrolled student and signs the blinded payload without ever seeing the resulting voter token or tying it to your selection.",
      guarantee: "The university knows you are eligible, but cannot link your credential to your cast ballot.",
    },
    {
      step: 2,
      title: "Isolated Ballot Casting and Nullifier Commitments",
      icon: Vote,
      summary: "Ballot encrypted in the client booth and submitted to an isolated casting origin.",
      technical:
        "The casting service lives on a distinct network cluster and database from student identity. When you cast your encrypted vote, the system verifies your blind credential proof and records a deterministic nullifier commitment to guarantee exactly one vote per voter.",
      guarantee: "Nullifiers prevent double voting without disclosing student identity or ballot plaintext.",
    },
    {
      step: 3,
      title: "Witnessed Merkle Tree Checkpoints",
      icon: Layers,
      summary: "Every ballot is committed as an immutable leaf in an append only hash tree.",
      technical:
        "Ballot records are hashed with RFC 9162 prefix 0x00 and appended to a cryptographic Merkle tree log. Periodically and at election close, an independent witness cosigns the checkpoint root digest with pinned Ed25519 keys.",
      guarantee: "No ballot can be inserted, deleted, or reordered without invalidating the witness signature.",
    },
    {
      step: 4,
      title: "Consortium Blockchain Finality Anchor",
      icon: Globe,
      summary: "Witnessed checkpoint digests are anchored to a public smart contract registry.",
      technical:
        "The witness checkpoint root and tree size are published to the consortium Ethereum smart contract. HimVote requires a minimum of 12 block confirmations to ensure immutability beyond blockchain reorganization depth.",
      guarantee: "Provides independent time stamped proof of ledger state that cannot be modified retrospectively.",
    },
    {
      step: 5,
      title: "Independent External Audit Verification",
      icon: FileCheck,
      summary: "External auditors independently execute standalone verifiers on airgapped hardware.",
      technical:
        "An appointed independent auditor exports complete evidence archives, verifies manifest digests using RFC 8785 canonical JSON, validates every Merkle leaf upward to the anchored root, and verifies witness signatures against pinned keys.",
      guarantee: "Guarantees mathematical correctness of the tally prior to public release.",
    },
    {
      step: 6,
      title: "Certified Public Results and Inclusion Verification",
      icon: ShieldCheck,
      summary: "Certified tallies published only after all cryptographic prerequisites pass.",
      technical:
        "Results are released to the public observer portal with full evidence bundles. Each individual voter can input their receipt handle to verify their personal leaf inclusion proof offline without revealing their selection.",
      guarantee: "Universal verifiability: anyone can audit the entire election, and each voter can verify their own vote.",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8]">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          End to End Verifiable Architecture
        </div>
        <h1 className="text-4xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
          How HimVote Verification Works
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
          Every meaningful state has a distinct cryptographic proof, invariant, and promise. No state is labeled confirmed until verified mathematically.
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
