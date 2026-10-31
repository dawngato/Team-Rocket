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
  GraduationCap,
  Users,
  Building2,
  CheckCircle2,
  Fingerprint,
  EyeOff,
  Flame,
  HelpCircle
} from "lucide-react";
import { StateBadge } from "../components/StateBadge";
import { LiveTurnoutHeroWidget } from "../components/LiveTurnoutHeroWidget";
import { StudentIdCardVerifier } from "../components/StudentIdCardVerifier";
import { electionClient } from "../lib/election_client";
import type { Election } from "../lib/types";

function formatUtc(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export default function HomePage() {
  const [receiptQuery, setReceiptQuery] = useState("");
  const [electionQuery, setElectionQuery] = useState("");
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [electionsError, setElectionsError] = useState<string | null>(null);
  const [electionsLoading, setElectionsLoading] = useState(true);
  const [activeStoryTab, setActiveStoryTab] = useState<"privacy" | "witness" | "receipt">("privacy");

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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      {/* 1. EMOTIONAL & WARM CAMPUS HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-[#1E3352] bg-gradient-to-br from-white via-slate-50/70 to-cyan-50/30 dark:from-[#10233F] dark:via-[#0E1E34] dark:to-[#07111E] p-6 sm:p-12 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Human Narrative */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold animate-linear-reveal-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>Himachal Technical Campus Democracy In Motion</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white leading-snug animate-linear-reveal-2">
                Na darr kisi ka, na kisi ka zor — <br />
                <span className="bg-gradient-to-r from-[#0284C7] via-[#00D2FF] to-emerald-500 bg-clip-text text-transparent">
                  Vote tumhara, campus ka daur.
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl animate-linear-reveal-3">
                Built for our campus democracy. Vote for your student council without fear of teacher bias, senior intimidation, or leaked preferences — protected by verified cryptographic privacy.
              </p>
            </div>

            {/* Direct Action Hub */}
            <div className="flex flex-wrap items-center gap-3 pt-2 animate-linear-reveal-4">
              <Link
                href="/elections"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#157E92] hover:bg-[#0E6273] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <Vote className="size-4" />
                <span>Cast Your Vote</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/student/help"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white/80 dark:bg-[#132135]/80 hover:bg-slate-100 dark:hover:bg-slate-800 px-5 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition-all active:scale-[0.98]"
              >
                <HelpCircle className="size-4 text-[#157E92]" />
                <span>Student Voter Guide</span>
              </Link>
            </div>

            {/* Real Campus Community Metrics Bar */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-[#1E3352]/60 grid grid-cols-3 gap-4 animate-linear-reveal-5">
              <div>
                <p className="text-xs text-slate-500 font-medium">Enrolled Cohort</p>
                <p className="text-xl sm:text-2xl font-black text-[#10233F] dark:text-white font-mono">Institutional</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Governance</p>
                <p className="text-xl sm:text-2xl font-black text-[#10233F] dark:text-white font-mono">Consortium</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Ballot Secrecy</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">RFC 9474</p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Turnout Electorate Widget (Real-time Campus Meter) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center w-full">
            <LiveTurnoutHeroWidget />
          </div>
        </div>
      </section>

      {/* 2. INSTANT STUDENT ID & ROLL NUMBER CHECK-IN (ANTI-FRAUD VERIFICATION) */}
      <section>
        <StudentIdCardVerifier />
      </section>

      {/* 4. ACTIVE ELECTIONS SHOWCASE */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#157E92]">
              Campus Polls
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#10233F] dark:text-white">
              Current Student Elections
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Authoritative elections hosted with verifiable voter manifests.
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

        {!electionsLoading && activeElections.length > 0 && (
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
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {elec.description || "University student election governed under verifiable audit logging."}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
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

      {/* 5. INSTITUTIONAL RESPONSIBILITY & SEPARATION OF POWERS */}
      <section className="rounded-3xl border border-slate-200 bg-slate-50/70 dark:border-[#1E3352] dark:bg-[#10233F]/40 p-6 sm:p-10 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-[#10233F] dark:text-white">
            Separation Of Powers On Campus
          </h2>
          <p className="text-xs text-slate-500">
            No single administrator, teacher, or server can alter results or deanonymize a voter.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
          <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-5 space-y-2">
            <div className="size-8 rounded-lg bg-cyan-500/10 text-[#0284C7] flex items-center justify-center font-black">
              1
            </div>
            <h3 className="font-bold text-sm text-[#10233F] dark:text-white">Voter Registrar (Teacher Desk)</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Verifies student identity and issues blind eligibility credentials. Has zero access to the ballot box.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-5 space-y-2">
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
              2
            </div>
            <h3 className="font-bold text-sm text-[#10233F] dark:text-white">Anonymous Casting Gateway</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Accepts blind tokens and encrypted ballots. Strips IP and identity headers to guarantee total voter privacy.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-5 space-y-2">
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
              3
            </div>
            <h3 className="font-bold text-sm text-[#10233F] dark:text-white">Independent Witness & Auditor</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Independently cosigns each checkpoint Merkle root. Anyone can re-run the open-source verifier CLI offline.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
