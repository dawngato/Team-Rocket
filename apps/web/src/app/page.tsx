"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Vote,
  ShieldCheck,
  BadgeCheck,
  FileCheck2,
  LockKeyhole,
  ArrowRight,
  Sparkles,
  Search,
  Calendar,
} from "lucide-react";
import { StateBadge } from "../components/StateBadge";
import { EvidenceOrbit } from "../components/EvidenceOrbit";
import { electionClient } from "../lib/election_client";
import type { Election } from "../lib/types";

function formatUtc(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZoneName: "short" }).format(date);
}

export default function HomePage() {
  const [receiptQuery, setReceiptQuery] = useState("");
  const [electionQuery, setElectionQuery] = useState("");
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [electionsError, setElectionsError] = useState<string | null>(null);
  const [electionsLoading, setElectionsLoading] = useState(true);
  const activeElections = useMemo(() => elections.slice(0, 3), [elections]);

  useEffect(() => {
    let cancelled = false;
    void electionClient.getElections()
      .then((nextElections) => {
        if (!cancelled) setElections(nextElections);
      })
      .catch((cause) => {
        if (!cancelled) setElectionsError(cause instanceof Error ? cause.message : "Elections could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setElectionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full max-w-[1800px] mx-auto space-y-16 py-8 px-[clamp(1.25rem,4vw,5rem)]">
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-6 pb-10">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] border border-[#157E92]/20">
            <span className="w-2 h-2 rounded-full bg-[#157E92] animate-pulse" />
            Educational prototype for verifiable election workflows
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#10233F] dark:text-white tracking-tight leading-tight">
            Institutional voting, made <span className="text-[#157E92]">verifiable.</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            HimVote demonstrates how institutional identity, anonymous casting boundaries, witnessed evidence, and independent review fit together. The external voting engine and production operations remain explicit release gates.
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
              Blind Credential Test Vectors
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#15805D]" aria-hidden="true" />
              Witness Checkpoint Workflow
            </span>
            <span className="inline-flex items-center gap-2">
              <LockKeyhole className="w-4 h-4 text-[#15805D]" aria-hidden="true" />
              No Identity in Sample Evidence
            </span>
          </div>
        </div>

        <div className="lg:col-span-5">
          <EvidenceOrbit />
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
              const handle = receiptQuery.trim();
              const electionId = electionQuery.trim();
              if (!handle || !electionId) {
                setReceiptError("Enter both the opaque receipt handle and its election ID. A handle alone is not enough to retrieve evidence.");
                return;
              }
              setReceiptError(null);
              window.location.href = `/student/receipts/${encodeURIComponent(handle)}?election_id=${encodeURIComponent(electionId)}`;
            }}
            className="flex flex-col gap-3 pt-3"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  value={receiptQuery}
                  onChange={(e) => setReceiptQuery(e.target.value)}
                  placeholder="Receipt handle"
                  aria-label="Receipt handle"
                  className="min-h-11 w-full rounded-lg border border-white/20 bg-white/10 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
                />
              </div>
              <input
                type="text"
                value={electionQuery}
                onChange={(e) => setElectionQuery(e.target.value)}
                placeholder="Election ID"
                aria-label="Election ID"
                className="min-h-11 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#38BDF8] sm:w-52"
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] px-6 py-3 rounded-lg font-bold bg-[#157E92] hover:bg-[#0E6273] text-white text-sm transition-colors flex items-center justify-center gap-2 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <span>Inspect Receipt</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            {receiptError && <p className="text-xs font-semibold text-[#FCD34D]" role="alert">{receiptError}</p>}
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
              Follow current campus elections and inspect published development records.
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

        {electionsError && <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="alert">{electionsError} Synthetic elections are not substituted.</div>}
        {electionsLoading && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">Loading elections from the authoritative service…</div>}
        {!electionsLoading && !electionsError && activeElections.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">No elections were returned by the authoritative service.</div>}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {activeElections.map((elec) => (
            <article
              key={elec.id}
              className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <StateBadge state={elec.state} size="sm" />
                  <span className="text-xs text-slate-500 font-mono">
                    {typeof elec.eligible_count === "number" ? `${elec.eligible_count} Eligible` : "Eligibility withheld"}
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
                  {formatUtc(elec.closes_at_utc)}
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
            Witness Checkpoint Workflow
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The local fixture records signed checkpoints for repeatable testing. A separately operated witness is required before production claims are enabled.
          </p>
        </div>

        <div className="space-y-3">
          <div className="w-10 h-10 rounded-lg bg-[#AA6C0B]/10 text-[#AA6C0B] flex items-center justify-center font-bold">
            03
          </div>
          <h3 className="text-lg font-bold text-[#10233F] dark:text-white">
            Checkpoint Anchor Verification Ledger
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The development chain adapter records checkpoint commitments only. External chain finality and independent operation remain unverified release requirements.
          </p>
        </div>
      </section>
    </div>
  );
}
