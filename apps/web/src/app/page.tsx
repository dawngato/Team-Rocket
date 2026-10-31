"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  GraduationCap,
  Users,
  Building2,
  CheckCircle2,
  Fingerprint,
  EyeOff,
  Flame,
  HelpCircle,
  FileSearch,
} from "lucide-react";
import { StateBadge } from "../components/StateBadge";
import { ElectionReadinessPanel } from "../components/LiveTurnoutHeroWidget";
import { electionClient } from "../lib/election_client";
import type { Election } from "../lib/types";

function formatUtc(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export default function HomePage() {
  const router = useRouter();
  const [receiptQuery, setReceiptQuery] = useState("");
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
      }).catch((cause) => {
        if (!cancelled) {
          setElections([]);
          setElectionsError(cause instanceof Error ? cause.message : "The election directory is unavailable.");
        }
      })
      .finally(() => {
        if (!cancelled) setElectionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReceiptSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = receiptQuery.trim();
    if (!query) {
      setReceiptError("Please enter a receipt handle.");
      return;
    }
    setReceiptError(null);
    router.push(`/student/receipts/${encodeURIComponent(query)}`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-14 md:space-y-20">
      {/* 1. CAMPUS HERO: HIGH-IMPACT HEADLINE & ARCHITECTURE METRICS */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-[#1E3352] bg-gradient-to-br from-white via-slate-50/70 to-cyan-50/30 dark:from-[#10233F] dark:via-[#0E1E34] dark:to-[#07111E] p-6 sm:p-10 lg:p-12 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Mission & Actions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-800 dark:text-cyan-300 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span>Himachal Campus Democracy · Verifiable Elections</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#10233F] dark:text-white leading-[1.15]">
                Campus elections, <br />
                <span className="bg-gradient-to-r from-[#0284C7] via-[#00D2FF] to-emerald-500 bg-clip-text text-transparent">
                  independently checkable.
                </span>
              </h1>
              <p className="text-sm font-semibold tracking-wide text-cyan-700 dark:text-cyan-400">
                Na darr kisi ka, na kisi ka zor — Vote tumhara, campus ka daur.
              </p>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Vote for your student council using a prototype built around private credentials and verifiable records.
                The ballot engine and witness deployment are development implementations, not independently audited election infrastructure.
              </p>
            </div>

            {/* Direct Action Hub */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/elections"
                className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-2xl bg-[#157E92] hover:bg-[#0E6273] px-6 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <Vote className="size-4" />
                <span>Cast Your Ballot</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white/80 dark:bg-[#132135]/80 hover:bg-slate-100 dark:hover:bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition-all active:scale-[0.98]"
              >
                <HelpCircle className="size-4 text-[#157E92]" />
                <span>How Verification Works</span>
              </Link>
            </div>

            {/* Prototype capability summary */}
            <div className="pt-5 border-t border-slate-200/60 dark:border-[#1E3352]/60 grid grid-cols-3 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Credential protocol</p>
                <p className="text-base sm:text-lg font-black text-[#10233F] dark:text-white font-mono mt-0.5">Blind signature</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Witness status</p>
                <p className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-300 font-mono mt-0.5">Local demo</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Result status</p>
                <p className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-300 font-mono mt-0.5">Not verified</p>
              </div>
            </div>
          </div>

          {/* Right Column: Prototype readiness status */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center w-full">
            <ElectionReadinessPanel />
          </div>
        </div>
      </section>

      {/* 2. QUICK RECEIPT VERIFICATION & INCLUSION LOOKUP BAR */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#157E92] uppercase tracking-wider">
              <FileSearch className="size-4" />
              <span>Receipt lookup</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#10233F] dark:text-white">
              Inspect a ballot receipt
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hold a receipt handle? Inspect the available record. A path from the same service is not independent verification.
            </p>
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={handleReceiptSearch} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  aria-label="Receipt handle for inclusion verification"
                  value={receiptQuery}
                  onChange={(e) => {
                    setReceiptQuery(e.target.value);
                    if (receiptError) setReceiptError(null);
                  }}
                  placeholder="Paste receipt handle (e.g. handle_65697c39a098eabc)"
                  className="w-full min-h-[46px] pl-10 pr-4 rounded-xl border border-slate-300 dark:border-[#1E3352] bg-[#F3F6FA] dark:bg-[#0B1524] text-sm text-[#10233F] dark:text-white font-mono placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#157E92]"
                />
              </div>
              <button
                type="submit"
                className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#157E92] hover:bg-[#0E6273] text-white text-sm font-bold shadow-sm transition-all active:scale-[0.98] shrink-0 flex items-center justify-center gap-2"
              >
                <span>Check receipt status</span>
                <ArrowRight className="size-4" />
              </button>
            </form>
            {receiptError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">{receiptError}</p>
            )}
          </div>
        </div>
      </section>

      {/* 3. STUDENT ACCOUNT ACCESS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#157E92]">Student access</span>
            <h2 className="mt-1 text-xl font-bold text-[#10233F] dark:text-white">Create an account or sign in</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Student eligibility is checked by the identity service. A photo or roll-number format check in a browser is not proof of enrollment.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href="/auth/register" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#157E92] px-5 text-sm font-semibold text-white hover:bg-[#0E6273]">Register</Link>
            <Link href="/auth/login" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#1E3352] dark:text-slate-200 dark:hover:bg-[#0E1A2B]">Sign in</Link>
          </div>
        </div>
      </section>

      {/* 4. CURRENT STUDENT ELECTIONS SHOWCASE */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 dark:border-[#1E3352]/80 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#157E92]">
              Campus Contests
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#10233F] dark:text-white">
              Current Student Elections
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Authoritative elections hosted with verifiable voter manifests and trustees.
            </p>
          </div>
          <Link
            href="/elections"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#157E92] hover:text-[#0E6273] dark:text-[#38BDF8]"
          >
            <span>View All Campus Elections</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {electionsLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-[#1E3352] dark:bg-[#132135]">
            Loading authoritative election directory...
          </div>
        )}

        {!electionsLoading && electionsError && (
          <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
            {electionsError} No sample elections are shown in place of live service data.
          </div>
        )}

        {!electionsLoading && !electionsError && activeElections.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">
            No public elections are currently available.
          </div>
        )}

        {!electionsLoading && !electionsError && activeElections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeElections.map((elec) => (
              <article
                key={elec.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow dark:border-[#1E3352] dark:bg-[#132135]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <StateBadge state={elec.state} size="sm" />
                    <span className="text-xs text-slate-400 font-mono">
                      {elec.eligible_count ? `${elec.eligible_count} Eligible` : ""}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-[#10233F] dark:text-white leading-snug">
                    {elec.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {elec.description || "University student election governed under verifiable audit logging."}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    {formatUtc(elec.closes_at_utc)}
                  </span>
                  <Link
                    href={elec.state === "OPEN" ? `/student/elections/${elec.id}/candidates` : `/results?election=${elec.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#157E92] hover:text-[#0E6273] dark:text-[#38BDF8]"
                  >
                    <span>{elec.state === "OPEN" ? "Enter Booth" : "View Results"}</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 5. SEPARATION OF POWERS ARCHITECTURE */}
      <section className="rounded-3xl border border-slate-200 bg-slate-50/70 dark:border-[#1E3352] dark:bg-[#10233F]/40 p-6 sm:p-10 lg:p-12 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#157E92]">
            Trust Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#10233F] dark:text-white">
            Separation Of Powers On Campus
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            This prototype separates identity and ballot services, but shared operators and infrastructure can still correlate metadata. Independent witness custody is not configured.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 space-y-3 shadow-xs">
            <div className="size-9 rounded-xl bg-cyan-500/10 text-[#0284C7] flex items-center justify-center font-black text-sm">
              1
            </div>
            <h3 className="font-bold text-sm sm:text-base text-[#10233F] dark:text-white">Voter Registrar (Teacher Desk)</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs sm:text-sm">
              Verifies student identity and issues eligibility credentials. The design does not store a named student choice; operational metadata may still be correlatable.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 space-y-3 shadow-xs">
            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-sm">
              2
            </div>
            <h3 className="font-bold text-sm sm:text-base text-[#10233F] dark:text-white">Anonymous Casting Gateway</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs sm:text-sm">
              Accepts credentials and encrypted ballots. The gateway strips selected identity and forwarding headers, but this does not eliminate timing or network correlation.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 space-y-3 shadow-xs">
            <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-sm">
              3
            </div>
            <h3 className="font-bold text-sm sm:text-base text-[#10233F] dark:text-white">Independent Witness & Auditor</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs sm:text-sm">
              The local demo witness records checkpoints. An independently operated witness and external trust pins are required before checkpoint roots can be treated as independent evidence.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
