"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Vote,
  ShieldCheck,
  BadgeCheck,
  Fingerprint,
  FileCheck2,
  LockKeyhole,
  ArrowRight,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  Users,
} from "lucide-react";
import { StateBadge } from "../components/StateBadge";
import { INITIAL_ELECTIONS } from "../lib/mock_data";

export default function HomePage() {
  const [receiptQuery, setReceiptQuery] = useState("");
  const activeElections = INITIAL_ELECTIONS.slice(0, 3);

  return (
    <div className="w-full max-w-[1800px] mx-auto space-y-16 py-8 px-[clamp(1.25rem,4vw,5rem)]">
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-6 pb-10">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] border border-[#157E92]/20">
            <span className="w-2 h-2 rounded-full bg-[#157E92] animate-pulse" />
            Institutional Elections With Verifiable Integrity
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#10233F] dark:text-white tracking-tight leading-tight">
            Institutional voting, made <span className="text-[#157E92]">verifiable.</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            HimVote establishes cryptographic separation between student identity and encrypted ballot submissions. Every tally is witness signed and anchored with immutable public finality.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/elections"
              className="min-h-[44px] px-6 py-3 rounded-lg font-bold text-white bg-[#157E92] hover:bg-[#0E6273] shadow-md transition-all flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
            >
              <span>Explore Active Elections</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href="/how-it-works"
              className="min-h-[44px] px-6 py-3 rounded-lg font-bold text-[#10233F] dark:text-white bg-white dark:bg-[#132135] border border-slate-300 dark:border-[#1E3352] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
            >
              <FileCheck2 className="w-4 h-4 text-[#157E92]" aria-hidden="true" />
              <span>How Verification Works</span>
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap gap-6 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span className="inline-flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-[#15805D]" aria-hidden="true" />
              Cryptographic Blind Credentials
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#15805D]" aria-hidden="true" />
              Independent Witness Nodes
            </span>
            <span className="inline-flex items-center gap-2">
              <LockKeyhole className="w-4 h-4 text-[#15805D]" aria-hidden="true" />
              Zero Voter Identity in Ballots
            </span>
          </div>
        </div>

        {/* Cryptographic Proof Card Hero Art */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1E3352]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#15805D]" aria-hidden="true" />
                <span className="font-bold text-sm text-[#10233F] dark:text-white">
                  Live Election Evidence Record
                </span>
              </div>
              <StateBadge state="WITNESSED" size="sm" />
            </div>

            <div className="py-5 space-y-4 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-sans">
                  Final Checkpoint Digest
                </span>
                <span className="text-[#10233F] dark:text-white font-semibold break-all">
                  8f2d 34ac 91e7 0258 b3c9 9a4e 27f6 7856
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100 dark:border-[#1E3352]">
                <div>
                  <span className="text-slate-400 block text-[11px] font-sans">Tree Size</span>
                  <strong className="text-sm font-sans text-[#10233F] dark:text-white">
                    3,120 leaves
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-sans">Witness Cosigners</span>
                  <strong className="text-sm font-sans text-[#15805D]">
                    2 of 2 Valid
                  </strong>
                </div>
              </div>

              <div className="space-y-2 font-sans text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Ed25519 Checkpoint Signature</span>
                  <span className="font-semibold text-[#15805D]">Confirmed</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Chain Finality Anchor</span>
                  <span className="font-semibold text-[#15805D]">Confirmed</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-[#157E92]" aria-hidden="true" />
                Opaque Nullifier Commitment
              </span>
              <span className="font-mono text-[#157E92]">HV 24F8 19C2</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Receipt Look Up Widget */}
      <section className="rounded-2xl bg-[#10233F] text-white p-8 sm:p-10 shadow-lg">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#38BDF8] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Voter Inclusion Check
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Verify your ballot was included in the final tree
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Enter your receipt handle to inspect checkpoint witness signatures, Merkle branch proofs, and public chain transaction records without compromising your voting secrecy.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const handle = receiptQuery.trim() || "HV_24F8_19C2";
              window.location.href = `/student/receipts/${encodeURIComponent(handle)}`;
            }}
            className="flex flex-col sm:flex-row gap-3 pt-3"
          >
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                value={receiptQuery}
                onChange={(e) => setReceiptQuery(e.target.value)}
                placeholder="Enter Receipt Handle (e.g. HV 24F8 19C2)"
                aria-label="Receipt Handle"
                className="w-full min-h-[44px] pl-11 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#38BDF8] transition-colors"
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] px-6 py-3 rounded-lg font-bold bg-[#157E92] hover:bg-[#0E6273] text-white text-sm transition-colors flex items-center justify-center gap-2 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <span>Inspect Receipt</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </section>

      {/* Live Featured Elections */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
              Institutional Elections
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Follow current campus elections and inspect certified historic records.
            </p>
          </div>
          <Link
            href="/elections"
            className="min-h-[44px] inline-flex items-center gap-2 text-sm font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline"
          >
            <span>View All Elections</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activeElections.map((elec) => (
            <article
              key={elec.id}
              className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <StateBadge state={elec.state} size="sm" />
                  <span className="text-xs text-slate-500 font-mono">
                    {elec.eligible_count} Eligible
                  </span>
                </div>
                <h3 className="font-bold text-lg text-[#10233F] dark:text-white leading-snug">
                  {elec.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                  {elec.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  {new Date(elec.closes_at_utc).toLocaleDateString()}
                </span>
                <Link
                  href={elec.state === "OPEN" ? `/student/elections/${elec.id}/candidates` : `/results?election=${elec.id}`}
                  className="min-h-[44px] px-3 py-1.5 text-xs font-bold text-[#157E92] dark:text-[#38BDF8] hover:bg-[#157E92]/10 rounded-md transition-colors flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
                >
                  <span>{elec.state === "OPEN" ? "Review and Vote" : "View Tally"}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Verification Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-t border-slate-200 dark:border-[#1E3352]">
        <div className="space-y-3">
          <div className="w-10 h-10 rounded-lg bg-[#157E92]/10 text-[#157E92] flex items-center justify-center font-bold">
            01
          </div>
          <h3 className="text-lg font-bold text-[#10233F] dark:text-white">
            Dual Origin Separation
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Identity services issue blind tokens without knowledge of candidate choices. Casting gateways record ballots without learning voter identity.
          </p>
        </div>

        <div className="space-y-3">
          <div className="w-10 h-10 rounded-lg bg-[#15805D]/10 text-[#15805D] flex items-center justify-center font-bold">
            02
          </div>
          <h3 className="text-lg font-bold text-[#10233F] dark:text-white">
            Independent Witness Signatures
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Checkpoints are cosigned in batches by external university nodes. A compromised election engine cannot alter the append only leaf sequence.
          </p>
        </div>

        <div className="space-y-3">
          <div className="w-10 h-10 rounded-lg bg-[#AA6C0B]/10 text-[#AA6C0B] flex items-center justify-center font-bold">
            03
          </div>
          <h3 className="text-lg font-bold text-[#10233F] dark:text-white">
            Immutable Anchor Finality
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The final Merkle root is anchored on public blockchain infrastructure, ensuring permanent auditability and zero retrospective tampering.
          </p>
        </div>
      </section>
    </div>
  );
}
