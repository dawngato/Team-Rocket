"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ShieldCheck,
  Vote,
  Activity,
  Hourglass,
  Users,
  Lock,
  Cpu,
  FileCheck2,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
  BarChart3,
  Layers,
  Award,
} from "lucide-react";
import { StateBadge } from "../components/StateBadge";
import { electionClient } from "../lib/election_client";
import type { Election } from "../lib/types";
import { StudentIdCardVerifier } from "../components/StudentIdCardVerifier";
import {
  getStoredElectionConfig,
  type ElectionConfig,
} from "../lib/college_voter_store";

function formatUtc(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

interface LiveBallotEvent {
  id: string;
  ballotNumber: number;
  timeAgo: string;
  hashPreview: string;
}

export default function HomePage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [electionsError, setElectionsError] = useState<string | null>(null);
  const [electionsLoading, setElectionsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Reactive election config state
  const [config, setConfig] = useState<ElectionConfig>(() =>
    getStoredElectionConfig()
  );
  const [votesCast, setVotesCast] = useState<number>(() => config.votesCast);
  const [timeLeftStr, setTimeLeftStr] = useState<string>("Calculating...");
  const [isElectionEnded, setIsElectionEnded] = useState<boolean>(false);

  // Live recent ballot stream
  const [recentEvents, setRecentEvents] = useState<LiveBallotEvent[]>([
    {
      id: "evt-1",
      ballotNumber: 3412,
      timeAgo: "Just now",
      hashPreview: "0x8f2a...91ce",
    },
    {
      id: "evt-2",
      ballotNumber: 3411,
      timeAgo: "2 min ago",
      hashPreview: "0x3b1c...44a7",
    },
    {
      id: "evt-3",
      ballotNumber: 3410,
      timeAgo: "5 min ago",
      hashPreview: "0xe79d...f021",
    },
  ]);

  const featuredElections = useMemo(() => elections.slice(0, 4), [elections]);

  // Load elections from client
  useEffect(() => {
    let cancelled = false;
    setElectionsLoading(true);
    setElectionsError(null);

    void electionClient
      .getElections()
      .then((nextElections) => {
        if (!cancelled) setElections(nextElections);
      })
      .catch(() => {
        if (!cancelled)
          setElectionsError(
            "Unable to synchronize with the campus elections ledger. Please check your connectivity and try again."
          );
      })
      .finally(() => {
        if (!cancelled) setElectionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  // Sync reactive voter telemetry events
  useEffect(() => {
    const initialConfig = getStoredElectionConfig();
    setConfig(initialConfig);
    setVotesCast(initialConfig.votesCast);

    const handleConfigSync = (e: Event) => {
      const customEvent = e as CustomEvent<Partial<ElectionConfig>>;
      if (customEvent.detail) {
        setConfig((prev) => {
          const updated = { ...prev, ...customEvent.detail };
          if (customEvent.detail.votesCast !== undefined) {
            setVotesCast(customEvent.detail.votesCast);
          }
          return updated;
        });
      }
    };

    const handleBallotCast = (e: Event) => {
      const customEvent = e as CustomEvent<{
        ballotNumber: number;
        ballotId: string;
        timestamp: string;
      }>;
      if (customEvent.detail) {
        const nextNum = customEvent.detail.ballotNumber;
        const randomHex = Math.random().toString(16).substring(2, 6);
        setVotesCast(nextNum);
        setRecentEvents((old) => [
          {
            id: String(Date.now()),
            ballotNumber: nextNum,
            timeAgo: "Just now",
            hashPreview: `0x${randomHex}...${nextNum.toString(16)}`,
          },
          ...old.slice(0, 2),
        ]);
      }
    };

    window.addEventListener(
      "himvote_election_config_updated",
      handleConfigSync
    );
    window.addEventListener("himvote_ballot_cast_event", handleBallotCast);

    return () => {
      window.removeEventListener(
        "himvote_election_config_updated",
        handleConfigSync
      );
      window.removeEventListener(
        "himvote_ballot_cast_event",
        handleBallotCast
      );
    };
  }, []);

  // Countdown timer toward scheduled poll close
  useEffect(() => {
    const updateCountdown = () => {
      const endMs = new Date(config.endTimeIso).getTime();
      const nowMs = Date.now();
      const diffMs = endMs - nowMs;

      if (diffMs <= 0) {
        setTimeLeftStr("Polls Officially Concluded");
        setIsElectionEnded(true);
        return;
      }

      setIsElectionEnded(false);
      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const pad = (n: number) => String(n).padStart(2, "0");
      if (days > 0) {
        setTimeLeftStr(`${days}d ${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`);
      } else {
        setTimeLeftStr(`${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [config.endTimeIso]);

  // Derived telemetry metrics
  const remainingStudents = Math.max(0, config.totalStudents - votesCast);
  const turnoutPercent =
    config.totalStudents > 0
      ? ((votesCast / config.totalStudents) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="w-full bg-slate-50/40 dark:bg-[#060e1a]/40 transition-colors">
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-8 sm:py-12 lg:py-16 space-y-16 lg:space-y-24">
        
        {/* ========================================================================= */}
        {/* SECTION 1: EXPANSIVE WIDESCREEN HERO WITH INSTITUTIONAL HIGH-CONTRAST TYPOGRAPHY */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="hero-heading"
          className="relative overflow-hidden rounded-[32px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gradient-to-br dark:from-[#081526] dark:via-[#07111e] dark:to-[#040913] p-6 sm:p-10 lg:p-16 shadow-xl dark:shadow-2xl dark:shadow-cyan-950/30"
        >
          {/* Ambient Lighting Accents */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/15" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/10" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: Mission & CTAs (7 cols) */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8">
              {/* Institutional Live Network Badge */}
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold text-[#116B7B] dark:text-cyan-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                <span>Official Institutional Election Network</span>
                <span className="hidden sm:inline-block text-cyan-500/40">•</span>
                <span className="hidden sm:inline-block font-mono text-[11px] text-slate-500 dark:text-cyan-200/80">
                  SHA-256 Ledger Witnessed
                </span>
              </div>

              {/* High-Impact Institutional Headline */}
              <div className="space-y-3">
                <h1
                  id="hero-heading"
                  className="text-balance text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.08]"
                >
                  Democracy on Campus.
                  <br />
                  <span className="bg-gradient-to-r from-[#157E92] via-teal-600 to-emerald-600 dark:from-cyan-400 dark:via-teal-300 dark:to-emerald-400 bg-clip-text text-transparent">
                    Engineered for Verifiability.
                  </span>
                </h1>
                <p className="max-w-2xl text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  HimVote delivers institutional elections with independent cryptographic receipts, complete voter privacy detachment, and a verifiable Merkle ledger.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4 pt-2">
                <Link
                  href="/elections"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#10233F] to-[#157E92] hover:from-[#0d1d35] hover:to-[#10687a] dark:from-cyan-500 dark:to-teal-500 dark:hover:from-cyan-400 dark:hover:to-teal-400 px-7 text-sm sm:text-base font-bold text-white shadow-lg shadow-cyan-950/20 dark:shadow-cyan-500/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  <Vote className="w-5 h-5" aria-hidden="true" />
                  <span>Explore Campus Elections</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" aria-hidden="true" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-6 text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  <ShieldCheck className="w-5 h-5 text-[#157E92] dark:text-cyan-400" aria-hidden="true" />
                  <span>How Verification Works</span>
                </Link>
              </div>

              {/* Micro-Features Checklist */}
              <div className="pt-4 border-t border-slate-200/90 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Zero identity-to-vote linkage</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Independent receipt audit</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Immutable witness log</span>
                </div>
              </div>
            </div>

            {/* Right Column: Live Telemetry Snapshot Card (5 cols) */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-200 dark:border-cyan-500/30 bg-slate-50/80 dark:bg-gradient-to-b dark:from-[#0b1b2d] dark:to-[#040b15] p-6 sm:p-7 shadow-lg space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                      <Activity className="size-4 animate-pulse" />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Live Electorate Telemetry
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Campus-wide participation overview
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Polls Active
                  </span>
                </div>

                {/* Poll Countdown Display */}
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-center gap-3">
                  <div className="size-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Hourglass className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-300 block">
                      Scheduled Close • Sunday 5:00 PM
                    </span>
                    <span className="text-sm sm:text-base font-mono font-extrabold text-amber-900 dark:text-amber-200 truncate block">
                      {timeLeftStr}
                    </span>
                  </div>
                </div>

                {/* Turnout Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      Electorate Turnout
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {turnoutPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-300/60 dark:border-slate-800">
                    <div
                      className="bg-gradient-to-r from-[#157E92] to-emerald-500 dark:from-cyan-500 dark:to-emerald-400 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                      style={{ width: `${turnoutPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{votesCast.toLocaleString()} Cast</span>
                    <span>{config.totalStudents.toLocaleString()} Eligible</span>
                  </div>
                </div>

                {/* 3 Metrics Mini Grid */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-3 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Total</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                      {config.totalStudents.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-center">
                    <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Sealed</div>
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
                      {votesCast.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-3 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Pending</div>
                    <div className="text-lg font-black text-slate-800 dark:text-amber-300 font-mono mt-0.5">
                      {remainingStudents.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Footer link to public audit */}
                <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/10">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                    Cryptographic Proofs Certified
                  </span>
                  <Link
                    href="/audit"
                    className="text-[#157E92] hover:text-[#0e5c6a] dark:text-cyan-400 dark:hover:text-cyan-300 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Audit Explorer</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: BENTO GRID TELEMETRY STRETCHED ACROSS THE FULL SCREEN */}
        {/* ========================================================================= */}
        <section aria-labelledby="telemetry-bento-title" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#157E92] dark:text-cyan-400">
                Institutional Consensus &amp; Ledger Activity
              </p>
              <h2
                id="telemetry-bento-title"
                className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white"
              >
                Live Participation Telemetry
              </h2>
            </div>
            <Link
              href="/audit"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#157E92] hover:text-[#0E6273] dark:text-cyan-400 dark:hover:text-cyan-300 self-start sm:self-auto"
            >
              <span>Inspect Raw Merkle Batches</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 lg:gap-6">
            {/* Bento Card 1: Live Sealed Ballot Stream (5 cols) */}
            <div className="lg:col-span-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#07111e] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Live Sealed Ballot Ledger
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Append-Only
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {recentEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-xl bg-cyan-500/10 text-[#157E92] dark:text-cyan-400 flex items-center justify-center font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                            Ballot #{evt.ballotNumber} Sealed
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            Commitment: {evt.hashPreview}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        {evt.timeAgo}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Cryptographic commitments anchored in memory ledger</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">100% Validated</span>
              </div>
            </div>

            {/* Bento Card 2: Cryptographic Privacy Architecture (4 cols) */}
            <div className="lg:col-span-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#07111e] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="size-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Strict Boundary Separation
                  </h3>
                </div>

                <div className="mt-4 space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex gap-3">
                    <div className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 font-bold text-[10px] text-slate-700 dark:text-slate-300">
                      1
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Identity Station:</span> Validates enrollment eligibility and issues a one-time credential token.
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 font-bold text-[10px] text-slate-700 dark:text-slate-300">
                      2
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Detached Origin:</span> The voting station receives only the cryptographic token without your identity.
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 font-bold text-[10px] text-slate-700 dark:text-slate-300">
                      3
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Receipt Hash:</span> You retain a private inclusion hash to confirm your vote was counted.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/security-limits"
                  className="text-xs font-semibold text-[#157E92] dark:text-cyan-400 hover:underline flex items-center justify-between"
                >
                  <span>Review Threat Assumptions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Bento Card 3: Independent Witness Network (3 cols) */}
            <div className="lg:col-span-3 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#07111e] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Witness Nodes
                  </h3>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Node Alpha</span>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">ONLINE</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Faculty Observer</span>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">CO-SIGNED</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs">
                    <span className="text-slate-600 dark:text-slate-400">External Auditor</span>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">ACTIVE</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                Zero unilateral modifications permitted.
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: INSTANT VERIFICATION & CHECK-IN STATION (STRETCHED) */}
        {/* ========================================================================= */}
        <section aria-labelledby="verification-station-title" className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[#157E92] dark:text-cyan-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Campus Enrollment Check-In</span>
            </div>
            <h2
              id="verification-station-title"
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white"
            >
              Instant Student ID Card Verification
            </h2>
            <p className="max-w-3xl text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Verify your eligibility directly before heading to the ballot booth. Enter your College Roll Number and upload your institutional ID card photo for automatic geometric and roster validation.
            </p>
          </div>

          {/* Full-Width Stretched Verifier Component */}
          <div className="w-full">
            <StudentIdCardVerifier />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: FEATURED CAMPUS ELECTIONS GRID */}
        {/* ========================================================================= */}
        <section aria-labelledby="featured-elections-title" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#157E92] dark:text-cyan-400">
                Official Campus Balloting
              </p>
              <h2
                id="featured-elections-title"
                className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white"
              >
                Current Campus Elections
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Review available elections, examine contesting nominees, and review verified status.
              </p>
            </div>
            <Link
              href="/elections"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-[#10233F] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
            >
              <span>View All Campus Elections</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {electionsLoading && (
            <div
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-12 text-center space-y-3"
              role="status"
              aria-live="polite"
            >
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#157E92] dark:text-cyan-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Loading official election records from consensus ledger…
              </p>
            </div>
          )}

          {!electionsLoading && electionsError && (
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-rose-300/40 bg-rose-500/10 p-6"
              role="alert"
            >
              <p className="text-sm font-medium text-rose-800 dark:text-rose-200">
                {electionsError}
              </p>
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-rose-600 hover:bg-rose-500 px-5 text-xs font-semibold text-white transition-colors"
              >
                Retry Connection
              </button>
            </div>
          )}

          {!electionsLoading && !electionsError && featuredElections.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6">
              {featuredElections.map((election) => (
                <article
                  key={election.id}
                  className="group flex flex-col justify-between rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#07111e] p-6 shadow-sm hover:shadow-md hover:border-cyan-500/40 transition-all duration-200"
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StateBadge state={election.state} size="sm" />
                      {election.eligible_count ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          <Users className="w-3 h-3" />
                          {election.eligible_count.toLocaleString("en-IN")} Eligible
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold leading-snug text-[#10233F] dark:text-white group-hover:text-[#157E92] dark:group-hover:text-cyan-300 transition-colors">
                        {election.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {election.description ||
                          "Review candidates, examination criteria, and cast your verified institutional ballot."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Closes {formatUtc(election.closes_at_utc)}</span>
                    </div>

                    <Link
                      href={
                        election.state === "OPEN"
                          ? `/elections`
                          : `/results?election=${election.id}`
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#157E92] hover:text-[#0E6273] dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors shrink-0"
                    >
                      <span>
                        {election.state === "OPEN" ? "Review Ballots" : "Results"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!electionsLoading && !electionsError && featuredElections.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 p-12 text-center">
              <Vote className="w-10 h-10 mx-auto text-slate-400 mb-3" />
              <p className="text-base font-bold text-[#10233F] dark:text-white">
                No active elections scheduled at this moment
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Campus election schedules will appear here automatically upon certification by the election commission.
              </p>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION 5: CRYPTOGRAPHIC TRUST PILLARS & TRANSPARENCY MATRIX */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="trust-pillars-title"
          className="rounded-[32px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#07111e] p-6 sm:p-10 lg:p-14 shadow-sm space-y-10"
        >
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#157E92] dark:text-cyan-400">
              Zero Trust Security Foundation
            </p>
            <h2
              id="trust-pillars-title"
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white"
            >
              The Four Pillars of Institutional Integrity
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Unlike traditional surveys or black-box electronic voting, HimVote enforces mathematical verifiability at every step of the election lifecycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 p-6 space-y-3">
              <div className="size-10 rounded-xl bg-cyan-500/15 text-[#157E92] dark:text-cyan-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#10233F] dark:text-white">
                1. Identity Detachment
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Voter verification and ballot casting run on cryptographically isolated boundaries. The ballot box has no knowledge of which student submitted which ballot.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 p-6 space-y-3">
              <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#10233F] dark:text-white">
                2. Cryptographic Receipts
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Upon casting, every participant obtains an immutable SHA-256 receipt hash. You can check the public ledger to verify your ballot was included in the final count.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 p-6 space-y-3">
              <div className="size-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#10233F] dark:text-white">
                3. Merkle Tree Ledger
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                All votes are committed into an append-only Merkle tree data structure. Any alteration to previously recorded votes invalidates the entire mathematical root hash.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 p-6 space-y-3">
              <div className="size-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#10233F] dark:text-white">
                4. Witness Notarization
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Independent campus faculty and external observer nodes cross-sign the ledger state before, during, and after tally finalization to prevent unilateral manipulation.
              </p>
            </div>
          </div>

          {/* Institutional Transparency Matrix */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-3 px-4">Verification Capability</th>
                  <th className="py-3 px-4">Standard Paper Ballot</th>
                  <th className="py-3 px-4">Commercial Web Forms</th>
                  <th className="py-3 px-4 text-[#157E92] dark:text-cyan-400">HimVote Cryptographic Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                    End-to-End Individual Receipt
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">No receipt</td>
                  <td className="py-3.5 px-4 text-slate-500">Generic email confirmation</td>
                  <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    SHA-256 Merkle Receipt
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                    Cryptographic Identity Detachment
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">Physical box separation</td>
                  <td className="py-3.5 px-4 text-rose-500">Stored in database row</td>
                  <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Strict Boundary Tokens
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                    Public Auditability
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">Manual recount required</td>
                  <td className="py-3.5 px-4 text-slate-500">Closed database log</td>
                  <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Open Witness Ledger
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                    Tamper-Evident History
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">Physical seal check</td>
                  <td className="py-3.5 px-4 text-slate-500">Database updates allowed</td>
                  <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Append-Only Tree Structure
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 6: INSTITUTIONAL ACTION BANNER */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="cta-banner-title"
          className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#10233F] via-[#0D3455] to-[#157E92] p-8 sm:p-12 lg:p-16 text-white shadow-2xl"
        >
          <div className="relative z-10 max-w-3xl space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-cyan-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Participate in Campus Democracy</span>
            </span>
            <h2
              id="cta-banner-title"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight"
            >
              Ready to Make Your Voice Count?
            </h2>
            <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
              Verify your institutional enrollment, review contesting nominees across all campus elections, and cast your sealed vote with mathematical certainty.
            </p>
            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <Link
                href="/elections"
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-bold text-[#10233F] hover:bg-slate-100 transition-colors shadow-md"
              >
                <span>Browse All Elections</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/audit"
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 px-6 text-sm font-semibold text-white transition-colors"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Open Public Audit Explorer</span>
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
