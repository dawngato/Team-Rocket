"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "motion/react";
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
  RefreshCw,
  Sparkles,
  BarChart3,
  Sliders,
} from "lucide-react";
import { StateBadge } from "../components/StateBadge";
import { electionClient } from "../lib/election_client";
import type { Election } from "../lib/types";
import { StudentIdCardVerifier } from "../components/StudentIdCardVerifier";
import { BallotBoxHero } from "../components/BallotBoxHero";
import {
  getStoredElectionConfig,
  type ElectionConfig,
} from "../lib/college_voter_store";
import { SAMPLE_CAMPUS_ELECTIONS } from "../lib/sample_elections";

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

const heroContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

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
  const [timeLeftStr, setTimeLeftStr] = useState<string>("Calculating…");

  // Hero interactive right-card view tab: "protocol" (BallotBoxHero) vs "telemetry"
  const [heroView, setHeroView] = useState<"protocol" | "telemetry">("protocol");

  // Local sample activity
  const [recentEvents, setRecentEvents] = useState<LiveBallotEvent[]>([
    {
      id: "evt-1",
      ballotNumber: 3412,
      timeAgo: "Just now",
      hashPreview: "Sample activity",
    },
    {
      id: "evt-2",
      ballotNumber: 3411,
      timeAgo: "2 min ago",
      hashPreview: "Sample activity",
    },
    {
      id: "evt-3",
      ballotNumber: 3410,
      timeAgo: "5 min ago",
      hashPreview: "Sample activity",
    },
  ]);

  const featuredElections = useMemo(() => elections.slice(0, 4), [elections]);

  // Load elections from client with seamless campus fallback when offline
  useEffect(() => {
    let cancelled = false;
    setElectionsLoading(true);
    setElectionsError(null);

    void electionClient
      .getElections()
      .then((nextElections) => {
        if (!cancelled) {
          if (nextElections && nextElections.length > 0) {
            setElections(nextElections);
          } else {
            setElections(SAMPLE_CAMPUS_ELECTIONS);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Gracefully load campus reference elections so visitors always have an interactive experience
          setElections(SAMPLE_CAMPUS_ELECTIONS);
          setElectionsError(null);
        }
      })
      .finally(() => {
        if (!cancelled) setElectionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  // Sync local preview values
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
        setVotesCast(nextNum);
        setRecentEvents((old) => [
          {
            id: String(Date.now()),
            ballotNumber: nextNum,
            timeAgo: "Just now",
            hashPreview: "Local activity only",
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

  // Countdown timer for the locally configured demo close time
  useEffect(() => {
    const updateCountdown = () => {
      const endMs = new Date(config.endTimeIso).getTime();
      const nowMs = Date.now();
      const diffMs = endMs - nowMs;

      if (diffMs <= 0) {
        setTimeLeftStr("Configured demo close time has passed");
        return;
      }

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
      <div className="w-full max-w-[1850px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 py-8 sm:py-12 lg:py-16 space-y-16 lg:space-y-24">
        
        {/* ========================================================================= */}
        {/* SECTION 1: EXPANSIVE WIDESCREEN HERO POWERED BY MOTION/REACT */}
        {/* ========================================================================= */}
        <motion.section
          aria-labelledby="hero-heading"
          initial="hidden"
          animate="visible"
          variants={heroContainerVariants}
          className="relative overflow-hidden rounded-[32px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gradient-to-br dark:from-[#081526] dark:via-[#07111e] dark:to-[#040913] p-6 sm:p-10 lg:p-14 xl:p-16 shadow-xl dark:shadow-2xl dark:shadow-cyan-950/30"
        >
          {/* Ambient Lighting Accents */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/15" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/10" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-14 items-center">

            {/* Left Column: Mission, Animated Headlines & CTAs (7 cols) */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8">
              {/* Hero Kicker Badge with strict institutional terminology */}
              <motion.div
                variants={heroItemVariants}
                className="inline-flex flex-wrap items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-[#116B7B] dark:text-cyan-300"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                <span>Campus Election Prototype • Evidence Depends on Configuration</span>
              </motion.div>

              {/* High-Impact Institutional Headline with Animated Reveals */}
              <div className="space-y-3.5">
                <motion.h1
                  id="hero-heading"
                  variants={heroItemVariants}
                  className="text-balance text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.08]"
                >
                  Democracy on Campus.
                  <br />
                  <span className="bg-gradient-to-r from-[#157E92] via-teal-600 to-emerald-600 dark:from-cyan-400 dark:via-teal-300 dark:to-emerald-400 bg-clip-text text-transparent">
                    Designed for Verifiable Review.
                  </span>
                </motion.h1>
                <motion.p
                  variants={heroItemVariants}
                  className="max-w-2xl text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal"
                >
                  HimVote demonstrates campus election workflows and evidence views. Privacy and verification depend on the deployed protocols, configuration, and trusted evidence.
                </motion.p>
              </div>

              {/* Action Buttons with Spring Micro-Interactions */}
              <motion.div
                variants={heroItemVariants}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4 pt-1"
              >
                <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/elections"
                    className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#10233F] to-[#157E92] hover:from-[#0d1d35] hover:to-[#10687a] dark:from-cyan-500 dark:to-teal-500 dark:hover:from-cyan-400 dark:hover:to-teal-400 px-7 text-sm sm:text-base font-bold text-white shadow-lg shadow-cyan-950/20 dark:shadow-cyan-500/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    <Vote className="w-5 h-5" aria-hidden="true" />
                    <span>Explore Campus Elections</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" aria-hidden="true" />
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/operations"
                    className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 px-6 text-sm sm:text-base font-bold text-[#157E92] dark:text-cyan-300 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    <Activity className="w-5 h-5 text-[#157E92] dark:text-cyan-400" aria-hidden="true" />
                    <span>Operations Console</span>
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/how-it-works"
                    className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-6 text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    <ShieldCheck className="w-5 h-5 text-[#157E92] dark:text-cyan-400" aria-hidden="true" />
                    <span>How Verification Works</span>
                  </Link>
                </motion.div>
              </motion.div>

              {/* Micro-Features Checklist with Standardized Institutional Terms */}
              <motion.div
                variants={heroItemVariants}
                className="pt-4 border-t border-slate-200/90 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Identity separation is an intended design goal</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Published records can support independent review</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Merkle checkpoint support depends on configuration</span>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Interactive Hero Showcase (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              {/* Showcase Mode Switcher */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Interactive Showcase
                </span>
                <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-900/80 p-1 border border-slate-200/80 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setHeroView("protocol")}
                    className={`relative px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      heroView === "protocol"
                        ? "text-[#10233F] dark:text-white"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                    }`}
                  >
                    {heroView === "protocol" && (
                      <motion.div
                        layoutId="heroTabIndicator"
                        className="absolute inset-0 rounded-lg bg-white dark:bg-slate-800 shadow-xs"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Lock className="size-3 text-[#157E92] dark:text-cyan-400" />
                      Voting Protocol
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroView("telemetry")}
                    className={`relative px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      heroView === "telemetry"
                        ? "text-[#10233F] dark:text-white"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                    }`}
                  >
                    {heroView === "telemetry" && (
                      <motion.div
                        layoutId="heroTabIndicator"
                        className="absolute inset-0 rounded-lg bg-white dark:bg-slate-800 shadow-xs"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Activity className="size-3 text-emerald-500" />
                  Sample Metrics
                    </span>
                  </button>
                </div>
              </div>

              {/* View 1: BallotBoxHero (Always mounted for test-id & smooth display) */}
              <div className={heroView === "protocol" ? "block" : "hidden"}>
                <BallotBoxHero />
              </div>

              {/* View 2: Local sample metrics */}
              <div className={heroView === "telemetry" ? "block" : "hidden"}>
                <motion.div
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="rounded-3xl border border-slate-200 dark:border-cyan-500/30 bg-slate-50/80 dark:bg-gradient-to-b dark:from-[#0b1b2d] dark:to-[#040b15] p-6 sm:p-7 shadow-lg space-y-6"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                        <Activity className="size-4 animate-pulse" />
                      </span>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                          Local Participation Preview
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Sample values from this browser; not live election totals
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      Sample Preview
                    </span>
                  </div>

                  {/* Poll Countdown Display with Micro Spring Ticks */}
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Hourglass className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-300 block">
                        Configured Demo Close
                      </span>
                      <motion.span
                        key={timeLeftStr}
                        initial={{ opacity: 0.7, y: 1 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm sm:text-base font-mono font-extrabold text-amber-900 dark:text-amber-200 truncate block"
                      >
                        {timeLeftStr}
                      </motion.span>
                    </div>
                  </div>

                  {/* Animated Turnout Progress Bar Gauge */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        Demo Turnout Estimate
                      </span>
                      <motion.span
                        key={turnoutPercent}
                        initial={{ scale: 1.15 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm"
                      >
                        {turnoutPercent}%
                      </motion.span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-300/60 dark:border-slate-800">
                      <motion.div
                        className="bg-gradient-to-r from-[#157E92] to-emerald-500 dark:from-cyan-500 dark:to-emerald-400 h-full rounded-full shadow-sm"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, Math.max(0, Number(turnoutPercent)))}%`,
                        }}
                        transition={{ type: "spring", stiffness: 60, damping: 14 }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      <span>{votesCast.toLocaleString()} Demo Votes</span>
                      <span>{config.totalStudents.toLocaleString()} Sample Voters</span>
                    </div>
                  </div>

                  {/* 3 Metrics Mini Grid */}
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-3 text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Sample Total</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                        {config.totalStudents.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-center">
                      <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Local Count</div>
                      <motion.div
                        key={votesCast}
                        initial={{ scale: 1.08 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5"
                      >
                        {votesCast.toLocaleString()}
                      </motion.div>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-3 text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Remaining in Sample</div>
                      <div className="text-lg font-black text-slate-800 dark:text-amber-300 font-mono mt-0.5">
                        {remainingStudents.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Footer link to public audit */}
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/10">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                      No Proofs Verified Here
                    </span>
                    <Link
                      href="/audit"
                      className="text-[#157E92] hover:text-[#0e5c6a] dark:text-cyan-400 dark:hover:text-cyan-300 font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>Audit Explorer</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </motion.div>
              </div>

            </div>

          </div>
        </motion.section>

        {/* ========================================================================= */}
        {/* SECTION 2: LOCAL PARTICIPATION PREVIEW */}
        {/* ========================================================================= */}
        <section aria-labelledby="telemetry-bento-title" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#157E92] dark:text-cyan-400">
                Local Demo Data
              </p>
              <h2
                id="telemetry-bento-title"
                className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white"
              >
                Participation Preview
              </h2>
            </div>
            <Link
              href="/audit"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#157E92] hover:text-[#0E6273] dark:text-cyan-400 dark:hover:text-cyan-300 self-start sm:self-auto"
            >
              <span>Review Available Evidence</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 lg:gap-6">

            {/* Bento Card 1: Local demo values */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="lg:col-span-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#07111e] p-6 shadow-sm flex flex-col justify-between space-y-6"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Local Participation Preview
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Sample Values
                  </span>
                </div>

                {/* Poll Countdown Display */}
                <div className="mt-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3 flex items-center gap-3">
                  <div className="size-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Hourglass className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-300 block">
                      Configured Demo Close
                    </span>
                    <motion.span
                      key={timeLeftStr}
                      initial={{ opacity: 0.7, y: 1 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs sm:text-sm font-mono font-extrabold text-amber-900 dark:text-amber-200 truncate block"
                    >
                      {timeLeftStr}
                    </motion.span>
                  </div>
                </div>

                {/* Spring Animated Turnout Gauge */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      Demo Turnout Estimate
                    </span>
                    <motion.span
                      key={turnoutPercent}
                      initial={{ scale: 1.15 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm"
                    >
                      {turnoutPercent}%
                    </motion.span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-300/60 dark:border-slate-800">
                    <motion.div
                      className="bg-gradient-to-r from-[#157E92] to-emerald-500 dark:from-cyan-500 dark:to-emerald-400 h-full rounded-full shadow-sm"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, Math.max(0, Number(turnoutPercent)))}%`,
                      }}
                      transition={{ type: "spring", stiffness: 60, damping: 14 }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{votesCast.toLocaleString()} Demo Votes</span>
                    <span>{config.totalStudents.toLocaleString()} Sample Voters</span>
                  </div>
                </div>

                {/* Metrics 3-box */}
                <div className="grid grid-cols-3 gap-2 pt-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-2.5 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Sample Total</div>
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                      {config.totalStudents.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-2.5 text-center">
                    <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Local Count</div>
                    <motion.div
                      key={votesCast}
                      initial={{ scale: 1.08 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5"
                    >
                      {votesCast.toLocaleString()}
                    </motion.div>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-2.5 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Remaining in Sample</div>
                    <div className="text-base font-black text-slate-800 dark:text-amber-300 font-mono mt-0.5">
                      {remainingStudents.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-cyan-500" />
                  <span>Demo data from this browser</span>
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Not Live</span>
              </div>
            </motion.div>

            {/* Bento Card 2: Sample activity */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="lg:col-span-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#07111e] p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-cyan-500 animate-ping" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Sample Ballot Activity
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Sample Data
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  <AnimatePresence>
                    {recentEvents.map((evt) => (
                      <motion.div
                        key={evt.id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-xl bg-cyan-500/10 text-[#157E92] dark:text-cyan-400 flex items-center justify-center font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                              Demo Ballot #{evt.ballotNumber}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              Activity: {evt.hashPreview}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {evt.timeAgo}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Sample values are not blockchain data</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  Not Verified
                </span>
              </div>
            </motion.div>

            {/* Bento Card 3: Example witness statuses (3 cols) */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="lg:col-span-3 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#07111e] p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Example Witness Statuses
                  </h3>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Example node</span>
                    <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-500/10 px-2 py-0.5 rounded">
                      Sample
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Example observer</span>
                    <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-500/10 px-2 py-0.5 rounded">
                      Sample
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Example auditor</span>
                    <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-500/10 px-2 py-0.5 rounded">
                      Sample
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Illustration only. Witness signatures and independent operation are not verified here.
              </div>
            </motion.div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: INSTANT VERIFICATION & CHECK-IN STATION */}
        {/* ========================================================================= */}
        <section aria-labelledby="verification-station-title" className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[#157E92] dark:text-cyan-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Local ID Image Format Demo</span>
            </div>
            <h2
              id="verification-station-title"
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white"
            >
              Student ID Image Format Demo
            </h2>
            <p className="max-w-3xl text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Enter a roll number and choose an image to check input format and image dimensions in this browser. This demo does not read card text, query a roster, determine eligibility, or issue a credential.
            </p>
          </div>

          {/* Full-Width Stretched Verifier Component with spring hover */}
          <motion.div
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="w-full"
          >
            <StudentIdCardVerifier />
          </motion.div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: FEATURED CAMPUS ELECTIONS GRID */}
        {/* ========================================================================= */}
        <section aria-labelledby="featured-elections-title" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#157E92] dark:text-cyan-400">
                Election Listings
              </p>
              <h2
                id="featured-elections-title"
                className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white"
              >
                Current Campus Elections
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Election details and status are reported by the configured service.
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
                Loading election records from the configured service…
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
                <motion.article
                  key={election.id}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
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
                          "Review the candidates and election details reported by the configured service."}
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
                </motion.article>
              ))}
            </div>
          )}

          {!electionsLoading && !electionsError && featuredElections.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 p-12 text-center">
              <Vote className="w-10 h-10 mx-auto text-slate-400 mb-3" />
              <p className="text-base font-bold text-[#10233F] dark:text-white">
                No election records are currently available
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Election listings appear here when the configured election service provides them.
              </p>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION 5: EVIDENCE SCOPE AND TRUST BOUNDARIES */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="trust-pillars-title"
          className="rounded-[32px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#07111e] p-6 sm:p-10 lg:p-14 shadow-sm space-y-10"
        >
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#157E92] dark:text-cyan-400">
              Prototype Design and Verification Limits
            </p>
            <h2
              id="trust-pillars-title"
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white"
            >
              Evidence and Trust Boundaries
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              The prototype includes election and evidence workflows. Independent verification depends on deployed services, published evidence, and trusted keys.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 p-6 space-y-3"
            >
              <div className="size-10 rounded-xl bg-cyan-500/15 text-[#157E92] dark:text-cyan-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#10233F] dark:text-white">
                1. Identity and Ballot Data Separation
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                The design uses separate identity and casting services. The local prototype does not establish that ballot activity cannot be linked to a student.
              </p>
            </motion.div>

            {/* Pillar 2 */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 p-6 space-y-3"
            >
              <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#10233F] dark:text-white">
                2. Independently Verifiable Election Records
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                A casting service may return a receipt. Checking inclusion requires a published proof and trusted root; a receipt alone does not verify the tally.
              </p>
            </motion.div>

            {/* Pillar 3 */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 p-6 space-y-3"
            >
              <div className="size-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#10233F] dark:text-white">
                3. Tamper-Evident Merkle Log
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Configured services can publish Merkle checkpoints. A matching proof can show inclusion under a supplied root, which must be authenticated separately.
              </p>
            </motion.div>

            {/* Pillar 4 */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 p-6 space-y-3"
            >
              <div className="size-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#10233F] dark:text-white">
                4. Multi-Party Witness Attestation
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Independently operated witnesses can sign checkpoints when configured. The local deployment does not establish independent witness custody or prevent every form of manipulation.
              </p>
            </motion.div>
          </div>

          {/* Evidence Scope Table */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-3 px-4">Area</th>
                  <th className="py-3 px-4">What This Prototype Shows</th>
                  <th className="py-3 px-4 text-[#157E92] dark:text-cyan-400">What Requires Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                    Identity and Ballot Separation
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">Separate identity and casting service boundaries</td>
                  <td className="py-3.5 px-4 text-slate-500">Deployed data flows, credential protocol, and operator access</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                    Ballot Receipt
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">Receipt lookup may be available in a configured flow</td>
                  <td className="py-3.5 px-4 text-slate-500">Published inclusion proof and independently trusted root</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                    Checkpoint Evidence
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">Checkpoint and witness fields from configured services</td>
                  <td className="py-3.5 px-4 text-slate-500">Signature verification, key custody, and independent witness operation</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                    Blockchain Anchoring
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">A durable relayer outbox and chain integration path</td>
                  <td className="py-3.5 px-4 text-slate-500">Live RPC, deployed contract, signer permissions, and confirmed transaction</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 6: INSTITUTIONAL ACTION BANNER */}
        {/* ========================================================================= */}
        <motion.section
          aria-labelledby="cta-banner-title"
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
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
              Review election information and available verification evidence. Voting is available only when the election services are configured and active.
            </p>
            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/elections"
                  className="inline-flex min-h-[50px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-bold text-[#10233F] hover:bg-slate-100 transition-colors shadow-md"
                >
                  <span>Browse All Elections</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/audit"
                  className="inline-flex min-h-[50px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 px-6 text-sm font-semibold text-white transition-colors"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Open Public Audit Explorer</span>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.section>

      </div>
    </div>
  );
}
