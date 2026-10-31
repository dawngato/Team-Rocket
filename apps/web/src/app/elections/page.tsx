"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  Vote,
  Clock,
  ShieldCheck,
  Activity,
  Users,
  BookOpen,
  Scale,
  X,
  Lock,
  Hash,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election, Candidate } from "@/lib/types";

type TabFilter = "ALL" | "OPEN" | "UPCOMING" | "CLOSED" | "PUBLISHED";

function formatUtc(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Invalid timestamp"
    : parsed.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    function calc() {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds, expired: false });
    }
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.expired) {
    return (
      <span className="text-xs text-rose-500 font-semibold flex items-center gap-1">
        <Clock className="size-3" /> Concluded
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold tracking-tight">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span>
        Closes: {String(timeLeft.hours).padStart(2, "0")}h : {String(timeLeft.minutes).padStart(2, "0")}m :{" "}
        {String(timeLeft.seconds).padStart(2, "0")}s
      </span>
    </div>
  );
}

export default function ElectionsListPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [filterState, setFilterState] = useState<TabFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state for Candidate Manifestos & Electoral Regulations
  const [inspectingElection, setInspectingElection] = useState<Election | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"manifestos" | "regulations">("manifestos");

  useEffect(() => {
    let cancelled = false;
    void electionClient
      .getElections()
      .then((summaries) => Promise.all(summaries.map((election) => electionClient.getElection(election.id))))
      .then((nextElections) => {
        if (!cancelled) {
          setElections(nextElections);
          setError(null);
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setElections([]);
          setError(cause instanceof Error ? cause.message : "The election list could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const total = elections.length;
    const open = elections.filter((e) => e.state === "OPEN").length;
    const published = elections.filter((e) => e.state === "PUBLISHED").length;
    const upcoming = elections.filter((e) => ["DRAFT", "REVIEW", "APPROVED", "FROZEN", "SCHEDULED"].includes(e.state)).length;
    return { total, open, published, upcoming };
  }, [elections]);

  const filtered = useMemo(() => {
    return elections.filter((election) => {
      let matchesTab = true;
      if (filterState === "OPEN") {
        matchesTab = election.state === "OPEN";
      } else if (filterState === "UPCOMING") {
        matchesTab = ["DRAFT", "REVIEW", "APPROVED", "FROZEN", "SCHEDULED"].includes(election.state);
      } else if (filterState === "CLOSED") {
        matchesTab = ["CLOSING", "CLOSED", "PENDING_WITNESS", "FINAL_WITNESSED", "AUDIT_PENDING"].includes(election.state);
      } else if (filterState === "PUBLISHED") {
        matchesTab = ["PUBLISHED", "AUDIT_PASSED", "AUDITOR_ATTESTED"].includes(election.state);
      }

      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        election.title.toLowerCase().includes(query) ||
        (election.contest && election.contest.toLowerCase().includes(query)) ||
        election.id.toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [elections, filterState, searchTerm]);

  const filterTabs: Array<{ label: string; value: TabFilter; count?: number }> = [
    { label: "All Elections", value: "ALL", count: stats.total },
    { label: "Voting Open", value: "OPEN", count: stats.open },
    { label: "Upcoming", value: "UPCOMING", count: stats.upcoming },
    { label: "Closed & Auditing", value: "CLOSED" },
    { label: "Results Published", value: "PUBLISHED", count: stats.published },
  ];

  // Candidates for the active modal
  const modalCandidates: Candidate[] = inspectingElection?.candidates || [];

  return (
    <main className="mx-auto w-full max-w-[1850px] space-y-10 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 py-10">
      {/* Dynamic Hero Header with Live Institutional Metrics */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E3352] bg-gradient-to-br from-white via-slate-50 to-slate-100/60 dark:from-[#10233F] dark:via-[#0F1E36] dark:to-[#0B1524] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] text-xs font-semibold">
              <Vote className="size-3.5" aria-hidden="true" />
              Configured Election Service
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
              Campus Elections &amp; Ballots
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Browse election records returned by the configured service. This directory does not independently verify eligibility, candidate information, ballot privacy, or audit evidence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white/80 dark:bg-[#132135]/80 backdrop-blur px-4 py-2.5 shadow-sm">
              <Activity className="size-5 text-[#157E92] dark:text-[#38BDF8]" />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Open elections</p>
                <p className="text-lg font-bold text-[#10233F] dark:text-white">{stats.open} reported</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white/80 dark:bg-[#132135]/80 backdrop-blur px-4 py-2.5 shadow-sm">
              <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Results published</p>
                <p className="text-lg font-bold text-[#10233F] dark:text-white">{stats.published} reported</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white/80 dark:bg-[#132135]/80 backdrop-blur px-4 py-2.5 shadow-sm">
              <Scale className="size-5 text-indigo-500 dark:text-indigo-400" />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Evidence checks</p>
                <p className="text-lg font-bold text-[#10233F] dark:text-white">Not verified here</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-12 rounded-2xl border border-slate-200 bg-white dark:border-[#1E3352] dark:bg-[#132135]">
          <div className="flex flex-col items-center gap-3">
            <div className="size-7 border-2 border-[#157E92] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading elections from the configured service…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-6 text-sm text-[#8B2630] dark:text-[#FCA5A5] flex items-start gap-3" role="alert">
          <div>
              <p className="font-bold">Election service unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Controls Bar: Search Input + Animated Spring Filter Tabs */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="elections-search-input"
                aria-label="Search elections"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search elections by title, contest, or ID…"
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm shadow-sm transition-colors focus:border-[#157E92] focus:outline-none focus:ring-2 focus:ring-[#157E92]/20 dark:border-[#1E3352] dark:bg-[#132135] dark:text-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Clear search input"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs with Spring Layout Indicator */}
            <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-xl bg-slate-100/80 dark:bg-[#0B1524]/60 border border-slate-200 dark:border-[#1E3352]" aria-label="Filter elections">
              {filterTabs.map((tab) => {
                const isActive = filterState === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setFilterState(tab.value)}
                    className={`relative whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors duration-150 ${
                      isActive
                        ? "text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeFilterTab"
                        className="absolute inset-0 rounded-lg bg-[#157E92] shadow-sm"
                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {tab.label}
                      {tab.count !== undefined && (
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-[#1E3352] dark:bg-[#132135]">
              <p className="font-bold text-[#10233F] dark:text-white text-base">No Matching Elections Found</p>
              <p className="text-xs text-slate-500 mt-1">
                {elections.length === 0
                  ? "The configured service returned no elections."
                  : "Try changing the search term or election status filter."}
              </p>
            </div>
          )}

          {/* Fluid 4-Column Responsive Grid with Motion Physics */}
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((election) => {
                const isOpen = election.state === "OPEN";
                const isPublished = election.state === "PUBLISHED";
              const candidateCount = election.candidates?.length ?? 0;

                return (
                  <motion.article
                    key={election.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 22 } }}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md hover:border-[#157E92]/50 dark:border-[#1E3352] dark:bg-[#132135]"
                  >
                    <div className="space-y-4">
                      {/* Card Header Status */}
                      <div className="flex items-center justify-between gap-2">
                        <StateBadge state={election.state} size="sm" />
                        {isOpen && <CountdownTimer targetDate={election.closes_at_utc} />}
                        {!isOpen && (
                          <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                            {election.id}
                          </span>
                        )}
                      </div>

                      {/* Title & Scope */}
                      <div>
                        <h2 className="text-lg font-bold leading-snug text-[#10233F] dark:text-white group-hover:text-[#157E92] dark:group-hover:text-[#38BDF8] transition-colors">
                          {election.title}
                        </h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {election.contest || "Campus Electoral Delegation"}
                        </p>
                      </div>

                      {/* Ballot Submission Window & Metadata Table */}
                      <div className="rounded-xl bg-slate-50 dark:bg-[#0B1524]/60 p-3.5 space-y-2 border border-slate-100 dark:border-[#1E3352]/60 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="size-3 text-slate-400" />
                            Ballot Submission Window:
                          </span>
                        </div>
                        <div className="pl-4 space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Opens:</span>
                            <span className="font-medium">{formatUtc(election.opens_at_utc)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Closes:</span>
                            <span className="font-medium">{formatUtc(election.closes_at_utc)}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 flex justify-between items-center text-xs">
                          <span className="text-slate-500">Eligible voter count (reported):</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                            {typeof election.eligible_count === "number" ? `${election.eligible_count.toLocaleString()} reported` : "Not provided"}
                          </span>
                        </div>
                      </div>

                      {/* Candidates & Manifesto Quick Preview */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40 p-3 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#10233F] dark:text-white flex items-center gap-1.5">
                            <Users className="size-3.5 text-[#157E92]" />
                            <span>Candidates:</span>
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {candidateCount} returned
                          </span>
                        </div>

                        {/* Interactive trigger to open Manifesto Modal */}
                        <button
                          type="button"
                          onClick={() => {
                            setInspectingElection(election);
                            setActiveModalTab("manifestos");
                          }}
                          className="inline-flex w-full items-center justify-between rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8] hover:bg-[#157E92]/5 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="size-3.5" />
                            Candidate Details
                          </span>
                          <ChevronRight className="size-3.5 text-slate-400" />
                        </button>
                      </div>

                      {/* Cryptographic Manifest Digest Snippet */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Hash className="size-3" /> Digest:
                        </span>
                        <span className="truncate max-w-[150px]">
                          {election.manifest_digest ? `${election.manifest_digest.slice(0, 18)}…` : "Not provided"}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#1E3352] flex flex-col gap-2">
                      {isPublished ? (
                        <Link
                          href={`/results?election=${encodeURIComponent(election.id)}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors"
                        >
                          <ShieldCheck className="size-4" />
                          View Reported Results
                          <ArrowRight className="size-3.5" />
                        </Link>
                      ) : isOpen ? (
                        <>
                          <Link
                            href={`/student/elections/${encodeURIComponent(election.id)}/credential`}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#157E92] hover:bg-[#0E6273] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors"
                          >
                            <Vote className="size-4" />
                            Open Voting Booth
                            <ArrowRight className="size-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setInspectingElection(election);
                              setActiveModalTab("regulations");
                            }}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-1 text-[11px] font-medium"
                          >
                            <Scale className="size-3" />
                            Election Information
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectingElection(election);
                              setActiveModalTab("manifestos");
                            }}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            <BookOpen className="size-3.5 text-[#157E92]" />
                            Review Candidate Details
                          </button>
                          <Link
                            href={`/audit?election=${encodeURIComponent(election.id)}`}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                          >
                            <Lock className="size-3" />
                            Inspect Service-Reported Evidence
                          </Link>
                        </div>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </>
      )}

      {/* Modal for Candidate Manifestos & Electoral Regulations */}
      <AnimatePresence>
        {inspectingElection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectingElection(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            />

            {/* Modal Box */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-headline"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#10233F] border border-slate-200 dark:border-[#1E3352] shadow-2xl overflow-hidden z-10"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E3352] px-6 py-4 bg-slate-50/70 dark:bg-[#0B1524]/60">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#157E92] dark:text-[#38BDF8]">
                      Election record
                    </span>
                    <StateBadge state={inspectingElection.state} size="sm" />
                  </div>
                  <h3 id="modal-headline" className="text-lg font-bold text-[#10233F] dark:text-white">
                    {inspectingElection.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectingElection(null)}
                  className="rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                  aria-label="Close manifestos modal"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Sub-Tabs: Manifestos vs Regulations */}
              <div className="flex items-center border-b border-slate-200 dark:border-[#1E3352] px-6 bg-white dark:bg-[#10233F]">
                <button
                  type="button"
                  onClick={() => setActiveModalTab("manifestos")}
                  className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
                    activeModalTab === "manifestos"
                      ? "border-[#157E92] text-[#157E92] dark:text-[#38BDF8] dark:border-[#38BDF8]"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Users className="size-4" />
                    Candidate details ({modalCandidates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab("regulations")}
                  className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
                    activeModalTab === "regulations"
                      ? "border-[#157E92] text-[#157E92] dark:text-[#38BDF8] dark:border-[#38BDF8]"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Scale className="size-4" />
                      Election Information
                </button>
              </div>

              {/* Modal Body: Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeModalTab === "manifestos" && (
                  <div className="space-y-6">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Candidate information below is returned by the configured election service and has not been independently verified here.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {modalCandidates.map((cand) => (
                        <div
                          key={cand.id}
                          className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/50 dark:bg-slate-900/40 p-5 space-y-4 shadow-xs"
                        >
                          <div className="flex items-start gap-4">
                            {cand.avatar_url ? (
                              <div className="size-14 shrink-0 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={cand.avatar_url}
                                  alt={cand.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="size-14 shrink-0 rounded-xl bg-gradient-to-br from-[#157E92] to-[#10233F] text-white flex items-center justify-center font-bold text-lg">
                                {cand.name.slice(0, 2)}
                              </div>
                            )}

                            <div className="space-y-0.5">
                              <h4 className="font-bold text-base text-[#10233F] dark:text-white">
                                {cand.name}
                              </h4>
                              {cand.position && <p className="text-xs font-semibold text-[#157E92] dark:text-[#38BDF8]">{cand.position}</p>}
                              {cand.department && <p className="text-[11px] text-slate-500">{cand.department}</p>}
                              {cand.slate && <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-400">Slate: {cand.slate}</p>}
                            </div>
                          </div>

                          {cand.statement && (
                            <div className="rounded-lg bg-white dark:bg-[#10233F] p-3 text-xs italic text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-[#1E3352]">
                              &ldquo;{cand.statement}&rdquo;
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                    {modalCandidates.length === 0 && (
                      <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
                        The election service did not return candidate records for this election.
                      </p>
                    )}
                  </div>
                )}

                {activeModalTab === "regulations" && (
                  <section className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-2">
                      <h4 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                        <Scale className="size-4 text-amber-600 dark:text-amber-400" />
                        Election information
                      </h4>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        The details below are returned by the configured election service. This interface does not independently verify the election rules, eligibility policy, ballot privacy, or audit evidence.
                      </p>
                    </div>
                    <dl className="grid gap-3 rounded-xl border border-slate-200 p-4 text-xs dark:border-[#1E3352] sm:grid-cols-2">
                      <div><dt className="font-semibold text-slate-500">Election ID</dt><dd className="mt-1 break-all font-mono">{inspectingElection.id}</dd></div>
                      <div><dt className="font-semibold text-slate-500">Selection rule</dt><dd className="mt-1">{inspectingElection.selection_rule || "Not provided"}</dd></div>
                      <div><dt className="font-semibold text-slate-500">Opens</dt><dd className="mt-1">{formatUtc(inspectingElection.opens_at_utc)}</dd></div>
                      <div><dt className="font-semibold text-slate-500">Closes</dt><dd className="mt-1">{formatUtc(inspectingElection.closes_at_utc)}</dd></div>
                      <div className="sm:col-span-2"><dt className="font-semibold text-slate-500">Manifest digest</dt><dd className="mt-1 break-all font-mono">{inspectingElection.manifest_digest || "Not provided"}</dd></div>
                    </dl>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      Consult the organization operating this election for its approved rules, privacy notice, eligibility requirements, support contact, and dispute process.
                    </p>
                  </section>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-[#1E3352] px-6 py-4 bg-slate-50/70 dark:bg-[#0B1524]/60">
                <div className="text-[11px] text-slate-500 font-mono">
                  Election ID: {inspectingElection.id}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setInspectingElection(null)}
                    className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  >
                    Close Window
                  </button>
                  {inspectingElection.state === "OPEN" && (
                    <Link
                      href={`/student/elections/${encodeURIComponent(inspectingElection.id)}/credential`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#157E92] hover:bg-[#0E6273] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors"
                    >
                      <Vote className="size-3.5" />
                      Proceed to Voting Booth
                    </Link>
                  )}
                  {inspectingElection.state === "PUBLISHED" && (
                    <Link
                      href={`/results?election=${encodeURIComponent(inspectingElection.id)}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors"
                    >
                      <ShieldCheck className="size-3.5" />
                      View Reported Results
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
