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
import { BallotBoxHero } from "../components/BallotBoxHero";
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
    <div className="apple-home">
      {/* Hero Section */}
      <section className="apple-hero">
        <div className="apple-hero-copy">
          <div className="apple-eyebrow">
            <span className="w-2 h-2 rounded-full bg-[#157E92] animate-pulse" />
            Institutional platform for verifiable election workflows
          </div>
          <h1 className="apple-display">
            Institutional voting, made <span className="apple-display-accent">verifiable.</span>
          </h1>
          <p className="apple-lede">
            HimVote demonstrates how institutional identity, anonymous casting boundaries, witnessed evidence, and independent review fit together. The external voting engine and production operations remain explicit release gates.
          </p>

          <div className="apple-actions">
            <Link
              href="/elections"
              className="apple-cta focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0071e3]"
            >
              <span>Explore Active Elections</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href="/how-it-works"
              className="apple-cta-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0071e3]"
            >
              <FileCheck2 className="w-4 h-4 text-[#157E92]" aria-hidden="true" />
              <span>How Verification Works</span>
            </Link>
          </div>

          <div className="apple-trust-row">
            <span className="apple-trust-item">
              <BadgeCheck className="w-4 h-4 text-[#15805D]" aria-hidden="true" />
              Blind Credential Test Vectors
            </span>
            <span className="apple-trust-item">
              <ShieldCheck className="w-4 h-4 text-[#15805D]" aria-hidden="true" />
              Witness Checkpoint Workflow
            </span>
            <span className="apple-trust-item">
              <LockKeyhole className="w-4 h-4 text-[#15805D]" aria-hidden="true" />
              No Identity in Sample Evidence
            </span>
          </div>
        </div>

        <div className="lg:col-span-5">
          <BallotBoxHero />
          <div className="mt-8">
            <EvidenceOrbit />
          </div>
        </div>
      </section>

      {/* Quick Receipt Look Up Widget */}
      <section className="apple-receipt">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#2997ff] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Voter Inclusion Check
          </div>
          <h2 className="apple-receipt-title">
            Verify your ballot was included in the final tree
          </h2>
          <p className="apple-receipt-copy text-sm">
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
            className="flex flex-col gap-3 pt-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  value={receiptQuery}
                  onChange={(e) => setReceiptQuery(e.target.value)}
                  suppressHydrationWarning
                  placeholder="Receipt handle"
                  aria-label="Receipt handle"
                  className="apple-field py-3 pl-11 pr-4 text-sm placeholder:text-[#a1a1a6]"
                />
              </div>
              <input
                type="text"
                value={electionQuery}
                onChange={(e) => setElectionQuery(e.target.value)}
                suppressHydrationWarning
                placeholder="Election ID"
                aria-label="Election ID"
                className="apple-field px-4 py-3 text-sm placeholder:text-[#a1a1a6] sm:w-52"
              />
            </div>
            <button
              type="submit"
              className="apple-submit flex items-center justify-center gap-2 px-6 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <span>Inspect Receipt</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            {receiptError && <p className="text-xs font-semibold text-[#FCD34D]" role="alert">{receiptError}</p>}
          </form>
        </div>
      </section>

      {/* Live Featured Elections */}
      <section className="apple-section">
        <div className="apple-section-header">
          <div>
            <h2 className="apple-section-title">
              Institutional Elections
            </h2>
            <p className="apple-section-copy">
              Follow current campus elections and inspect published development records.
            </p>
          </div>
          <Link
            href="/elections"
            className="apple-link inline-flex items-center gap-2"
          >
            <span>View All Elections</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        {electionsError && <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="alert">{electionsError} Synthetic elections are not substituted.</div>}
        {electionsLoading && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">Loading elections from the authoritative service…</div>}
        {!electionsLoading && !electionsError && activeElections.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">No elections were returned by the authoritative service.</div>}
        <div className="apple-election-grid">
          {activeElections.map((elec) => (
            <article
              key={elec.id}
              className="apple-election-card"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <StateBadge state={elec.state} size="sm" />
                  <span className="text-xs text-slate-500 font-mono">
                    {typeof elec.eligible_count === "number" ? `${elec.eligible_count} Eligible` : "Eligibility withheld"}
                  </span>
                </div>
                <h3 className="font-semibold text-lg text-[#1d1d1f] dark:text-white leading-snug tracking-tight">
                  {elec.title}
                </h3>
                <p className="text-sm text-[#6e6e73] dark:text-[#a1a1a6] line-clamp-3">
                  {elec.description}
                </p>
              </div>

              <div className="pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
                <span className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  {formatUtc(elec.closes_at_utc)}
                </span>
                <Link
                  href={elec.state === "OPEN" ? `/student/elections/${elec.id}/candidates` : `/results?election=${elec.id}`}
                  className="min-h-[44px] px-3 py-1.5 text-xs font-semibold text-[#0071e3] hover:bg-[#0071e3]/10 rounded-full transition-colors flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0071e3]"
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
      <section className="apple-section apple-info-grid">
        <div className="apple-info-item">
          <div className="apple-info-number">
            01
          </div>
          <h3>
            Dual Origin Separation
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Identity services issue blind tokens without knowledge of candidate choices. Casting gateways record ballots without learning voter identity.
          </p>
        </div>

        <div className="apple-info-item">
          <div className="apple-info-number text-[#15805D]">
            02
          </div>
          <h3>
            Witness Checkpoint Workflow
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The local fixture records signed checkpoints for repeatable testing. A separately operated witness is required before production claims are enabled.
          </p>
        </div>

        <div className="apple-info-item">
          <div className="apple-info-number text-[#AA6C0B]">
            03
          </div>
          <h3>
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
