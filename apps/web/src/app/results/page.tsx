"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Download,
  ShieldCheck,
  Trophy,
  Users,
  CheckCircle2,
  Copy,
  ExternalLink,
  BarChart3,
  Flame,
  ArrowRight,
  Vote,
  FileCheck2,
  Award,
  Hash,
  Lock,
  Building2,
  Eye,
  FileText,
  X,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election, EvidencePackage, PublishedResults } from "@/lib/types";

export default function PublishedResultsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [currentElection, setCurrentElection] = useState<Election | null>(null);
  const [results, setResults] = useState<PublishedResults | null>(null);
  const [evidence, setEvidence] = useState<EvidencePackage | null>(null);
  const [loadingElections, setLoadingElections] = useState(true);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [copiedDigest, setCopiedDigest] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingElections(true);
    setServiceError(null);

    void electionClient
      .getElections()
      .then((nextElections) => {
        if (cancelled) return;
        const published = nextElections.filter((election) => election.state === "PUBLISHED");
        setElections(published);
        const requestedId = new URLSearchParams(window.location.search).get("election");
        const initialSelection =
          requestedId && published.some((election) => election.id === requestedId)
            ? requestedId
            : published[0]?.id ?? "";
        setSelectedElectionId(initialSelection);
      })
      .catch(() => {
        if (!cancelled) {
          setServiceError("Unable to load published election data from the configured service.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingElections(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedElectionId) {
      setCurrentElection(null);
      setResults(null);
      setEvidence(null);
      setLoadingEvidence(false);
      return;
    }

    let cancelled = false;
    setLoadingEvidence(true);
    setServiceError(null);
    setCurrentElection(null);
    setResults(null);
    setEvidence(null);

    void Promise.all([
      electionClient.getElection(selectedElectionId),
      electionClient.getResults(selectedElectionId),
      electionClient.getEvidence(selectedElectionId),
    ])
      .then(([nextElection, nextResults, nextEvidence]) => {
        if (cancelled) return;
        if (nextElection.state !== "PUBLISHED") {
          throw new Error("The selected election does not have published results.");
        }
        setCurrentElection(nextElection);
        setResults(nextResults);
        setEvidence(nextEvidence);
      })
      .catch((cause) => {
        if (!cancelled) {
          setServiceError(
            cause instanceof Error
              ? cause.message
              : "Unable to load results and evidence from the configured service."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEvidence(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedElectionId]);

  const totalVotes = results?.total_ballots ?? 0;
  const eligibleCount = currentElection?.eligible_count ?? null;
  const turnoutPercent =
    eligibleCount && eligibleCount > 0
      ? Math.min(100, Math.round((totalVotes / eligibleCount) * 1000) / 10)
      : null;

  const tally = useMemo(() => {
    if (!results?.tally) return [];
    return Object.entries(results.tally).sort((a, b) => b[1] - a[1]);
  }, [results]);

  const winner = tally.length > 0 ? tally[0] : null;
  const runnerUp = tally.length > 1 ? tally[1] : null;
  const victoryMargin = winner && runnerUp ? winner[1] - runnerUp[1] : 0;
  const victoryPercentage = winner && totalVotes > 0 ? Math.round((winner[1] / totalVotes) * 100) : 0;

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedDigest(label);
    setTimeout(() => setCopiedDigest(null), 2500);
  };

  const downloadJsonEvidence = () => {
    if (!currentElection || !results || !evidence) return;
    const payload = { election: currentElection, results, evidence, export_type: "REPORTED_RESULT_DATA" };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "himvote_reported_result_data_" + currentElection.id + ".json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadAuditReport = () => {
    if (!currentElection || !results || !evidence) return;
    const reportText = generateReportText();
    const url = URL.createObjectURL(new Blob([reportText], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "himvote_reported_results_" + currentElection.id + ".txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const generateReportText = () => {
    if (!currentElection || !results || !evidence) return "";

    return [
      "HIMVOTE REPORTED RESULTS DATA",
      "This export contains values returned by configured services. It is not an independent verification or certification.",
      "",
      "Election ID: " + currentElection.id,
      "Election: " + currentElection.title,
      "Contest: " + (currentElection.contest || "Not reported"),
      "Status: " + currentElection.state,
      "Published at: " + new Date(results.published_at_utc).toUTCString(),
      "Reported ballots: " + results.total_ballots.toLocaleString(),
      "Reported eligible count: " + (eligibleCount === null ? "Not reported" : eligibleCount.toLocaleString()),
      "Reported turnout: " + (turnoutPercent === null ? "Not available" : turnoutPercent + "%"),
      "",
      "Reported tally:",
      tally.map(([candidate, count]) => candidate + ": " + count.toLocaleString()).join("\n") || "No tally returned",
      "",
      "Evidence references (not verified by this export):",
      "Manifest digest: " + (currentElection.manifest_digest || "Not reported"),
      "Checkpoint digest: " + (evidence.final_checkpoint_digest || "Not reported"),
      "Anchor transaction reference: " + (evidence.anchor_tx_hash || "Not reported"),
      "Auditor signature reference: " + (evidence.auditor_signature || "Not reported"),
      "",
      "Verify each value with a trusted independent verifier before relying on it.",
    ].join("\n");
  };

  return (
    <main className="mx-auto w-full max-w-[1850px] space-y-10 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 py-12">
      {/* Header Banner */}
      <header className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-6 dark:border-[#1E3352] lg:flex-row lg:items-center">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Reported Results and Evidence
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
            Published Election Results
          </h1>
          <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Results and evidence references are loaded from configured services. This page does not independently verify signatures, chain inclusion, or tally correctness.
          </p>
        </div>

        {/* Action Buttons: Export Package + Download Audit Summary */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Eye className="size-4 text-[#157E92]" />
            Preview Data Report
          </button>

          <button
            type="button"
            onClick={downloadAuditReport}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
          >
            <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />
            Download Reported Results (TXT)
          </button>

          <button
            type="button"
            disabled={!currentElection || !results || !evidence}
            onClick={downloadJsonEvidence}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#157E92] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0E6273] transition-all disabled:pointer-events-none disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden="true" />
            Export Service Data (JSON)
          </button>
        </div>
      </header>

      {serviceError && (
        <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {serviceError}
        </div>
      )}
      {(loadingElections || loadingEvidence) && (
        <p role="status" className="text-sm text-slate-600 dark:text-slate-400">
          Loading published results…
        </p>
      )}
      {!loadingElections && elections.length === 0 && !serviceError && (
        <section className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <h2 className="font-semibold text-[#10233F] dark:text-white">No Published Results Available</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            The configured service has not returned a published election with results.
          </p>
        </section>
      )}

      {/* Published Election Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Published Election ({elections.length} Available)
          </span>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Lock className="size-3" /> Service-reported data; not verified here
          </span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-2" role="tablist" aria-label="Published elections">
          {elections.map((election) => {
            const isSelected = selectedElectionId === election.id;
            return (
              <button
                key={election.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedElectionId(election.id)}
                className={`relative min-h-12 whitespace-nowrap rounded-xl px-5 py-2.5 text-xs font-bold transition-colors shadow-xs border ${
                  isSelected
                    ? "text-white border-[#10233F] dark:border-[#157E92]"
                    : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-[#132135] dark:text-slate-300 border-slate-200 dark:border-[#1E3352]"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeResultsElection"
                    className="absolute inset-0 rounded-xl bg-[#10233F] dark:bg-[#157E92]"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2">
                  <ShieldCheck className={`size-4 ${isSelected ? "text-emerald-400" : "text-emerald-600"}`} />
                  <span>{election.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Results Dashboard Card */}
      {currentElection && results && evidence && (
        <section className="space-y-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] sm:p-8">
          {/* Contest Overview and Data Status */}
          <div className="flex flex-col lg:flex-row justify-between gap-6 border-b border-slate-100 pb-6 dark:border-[#1E3352] items-start lg:items-center">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#10233F] dark:text-white">
                  {currentElection.title}
                </h2>
                <StateBadge state={currentElection.state} size="md" />
              </div>
              <p className="text-xs text-slate-500">
                {currentElection.contest || "Contest not reported"} · Published at:{" "}
                {new Date(results.published_at_utc).toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-amber-300/70 bg-amber-50/70 p-3.5 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
              Values on this page are reported by configured services and have not been independently verified here.
            </div>
          </div>

          {/* Telemetry Dials & Core Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Ballots Cast */}
            <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/60 dark:bg-[#0B1524]/60 p-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Reported Ballots
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-[#10233F] dark:text-white">
                  {results.total_ballots.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">Service value</span>
              </div>
              <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Not independently verified
              </div>
            </div>

            {/* Total Electorate */}
            <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/60 dark:bg-[#0B1524]/60 p-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Reported Eligible Count
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-[#157E92] dark:text-[#38BDF8]">
                  {eligibleCount === null ? "Not reported" : eligibleCount.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">Service value</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Eligibility protocol not verified here
              </div>
            </div>

            {/* Turnout Percentage & Semi Dial Meter */}
            <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/60 dark:bg-[#0B1524]/60 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Voter Turnout Rate
                  </span>
                  <span className="text-[10px] font-bold font-mono text-[#15805D] dark:text-emerald-400">
                    Service-reported estimate
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-black text-[#15805D] dark:text-emerald-400">
                    {turnoutPercent === null ? "Not reported" : `${turnoutPercent}%`}
                  </span>
                  <span className="text-xs text-slate-500">Participation</span>
                </div>
              </div>

              {/* Progress bar visual for turnout */}
              <div className="mt-3 space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${turnoutPercent ?? 0}%` }}
                    transition={{ type: "spring", stiffness: 90, damping: 18 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#157E92]"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Calculated from reported counts</span>
                  <span>{turnoutPercent === null ? "Not available" : `${turnoutPercent}%`}</span>
                </div>
              </div>
            </div>

            {/* Merkle Log Tree Status */}
            <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/60 dark:bg-[#0B1524]/60 p-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Checkpoint Reference
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {evidence.final_checkpoint_digest ? "Reported" : "Not reported"}
                </span>
                <span className="text-xs text-slate-500">Not checked</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                <Lock className="size-3 text-indigo-500" /> Log properties not verified here
              </div>
            </div>
          </div>

          {/* Winner Spotlight Banner */}
          {winner && !results.privacy_limited && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent p-6 dark:border-amber-700/60 dark:from-amber-950/40 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg">
                    <Trophy className="size-7" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Highest Reported Tally
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                        <Flame className="size-3.5" /> Highest Votes
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {winner[0]}
                    </h3>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                      Contest:{" "}
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {currentElection.contest || "General Council"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Victory Stats Pill Cards */}
                <div className="flex items-center gap-3 self-start sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/60 dark:border-amber-900/40">
                  <div className="rounded-xl bg-white/90 dark:bg-[#132135]/90 border border-amber-200 dark:border-amber-800/60 px-4 py-2 text-center shadow-xs">
                    <span className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                      Total Votes
                    </span>
                    <span className="font-mono text-xl font-black text-amber-600 dark:text-amber-400">
                      {winner[1].toLocaleString()}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white/90 dark:bg-[#132135]/90 border border-amber-200 dark:border-amber-800/60 px-4 py-2 text-center shadow-xs">
                    <span className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                      Vote Share
                    </span>
                    <span className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {victoryPercentage}%
                    </span>
                  </div>
                  {runnerUp && (
                    <div className="rounded-xl bg-white/90 dark:bg-[#132135]/90 border border-amber-200 dark:border-amber-800/60 px-4 py-2 text-center shadow-xs">
                      <span className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                        Winning Margin
                      </span>
                      <span className="font-mono text-xl font-black text-[#157E92] dark:text-[#38BDF8]">
                        +{victoryMargin.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {runnerUp && (
                <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-900/30 text-xs text-slate-600 dark:text-slate-400">
                      The reported counts show a difference of{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{runnerUp[0]}</span> (
                  {runnerUp[1].toLocaleString()} votes) and a margin of{" "}
                  <span className="font-bold text-amber-700 dark:text-amber-300">
                    {victoryMargin.toLocaleString()} votes
                  </span>
                  .
                </div>
              )}
            </div>
          )}

          {/* Dynamic Animated Vote Share Bars with Spring Width Physics */}
          {!results.privacy_limited && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <BarChart3 className="size-4 text-[#157E92]" />
                  Reported Candidate Vote Distribution
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Total Ballots Reported: {results.total_ballots.toLocaleString()}
                </span>
              </div>

              <div className="space-y-4">
                {tally.map(([candidate, count], idx) => {
                  const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  const isTop = idx === 0;

                  return (
                    <div
                      key={candidate}
                      className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-4.5 dark:border-[#1E3352]/60 dark:bg-[#0B1524]/40 transition-colors"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <span className="flex size-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#10233F] dark:text-white">
                                {candidate}
                              </span>
                              {isTop && (
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                  <Trophy className="size-3" aria-hidden="true" /> Highest Reported Count
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">
                              Rank {idx + 1} Candidate
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                            {count.toLocaleString()} votes
                          </span>
                          <span className="rounded-md bg-[#157E92]/10 px-2.5 py-1 font-mono text-xs font-bold text-[#157E92] dark:text-[#38BDF8]">
                            {percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Dynamic Animated Bar with Spring Physics */}
                      <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(3, percentage))}%` }}
                          transition={{ type: "spring", stiffness: 80, damping: 15 }}
                          className={`h-full rounded-full ${
                            isTop
                              ? "bg-gradient-to-r from-[#157E92] via-[#25B4CF] to-emerald-500"
                              : "bg-slate-400 dark:bg-slate-600"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reported Evidence References */}
          <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-[#1E3352]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-600" />
                Evidence References and Verification Status
              </h4>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                Signatures not verified here
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-xs lg:grid-cols-3">
              {/* Manifest Digest */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 dark:border-[#1E3352] dark:bg-slate-900/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Election Manifest Digest</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(currentElection.manifest_digest, "manifest")}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Copy digest"
                  >
                    <Copy className="size-3" />
                  </button>
                </div>
                <span className="block truncate font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {currentElection.manifest_digest}
                </span>
                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Digest reported by service</span>
                  {copiedDigest === "manifest" && <span className="text-emerald-500 font-bold">Copied!</span>}
                </div>
              </div>

              {/* Final Merkle Checkpoint */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 dark:border-[#1E3352] dark:bg-slate-900/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Checkpoint Digest Reference</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(evidence.final_checkpoint_digest, "checkpoint")}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Copy digest"
                  >
                    <Copy className="size-3" />
                  </button>
                </div>
                <span className="block truncate font-mono text-[11px] font-bold text-[#15805D] dark:text-emerald-400">
                  {evidence.final_checkpoint_digest}
                </span>
                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Digest reported by service</span>
                  {copiedDigest === "checkpoint" && <span className="text-emerald-500 font-bold">Copied!</span>}
                </div>
              </div>

              {/* Ethereum Anchor Tx */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 dark:border-[#1E3352] dark:bg-slate-900/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Anchor Transaction Reference</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(evidence.anchor_tx_hash, "tx")}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Copy hash"
                  >
                    <Copy className="size-3" />
                  </button>
                </div>
                <span className="block truncate font-mono text-[11px] font-bold text-[#157E92] dark:text-[#38BDF8]">
                  {evidence.anchor_tx_hash}
                </span>
                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Chain ID: {evidence.chain_id ?? "Not reported"}</span>
                  {copiedDigest === "tx" && <span className="text-emerald-500 font-bold">Copied!</span>}
                </div>
              </div>
            </div>

            {/* Independent Witness Cosignature Deep Inspection Card */}
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 dark:border-emerald-900/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    Witness Signature Reference
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    Key ID: {evidence.witness_key_id || "Not reported"}
                  </span>
                  <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                    Algorithm not reported
                  </span>
                </div>
              </div>

              <div className="space-y-1 font-mono text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                  Signature value reported by service
                </span>
                <div className="flex items-center justify-between rounded-lg bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 p-2.5 text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto">
                  <span className="truncate">{evidence.auditor_signature}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(evidence.auditor_signature, "sig")}
                    className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                    title="Copy signature"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
                {copiedDigest === "sig" && <span className="text-[10px] text-emerald-500 font-bold">Signature copied to clipboard!</span>}
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                This page displays signature and transaction references from the configured service. It does not verify their validity, key ownership, chain inclusion, or the relationship between the references.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Certified Audit Summary Certificate Modal */}
      <AnimatePresence>
        {reportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReportModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="report-modal-title"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#10233F] border border-slate-200 dark:border-[#1E3352] shadow-2xl overflow-hidden z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E3352] px-6 py-4 bg-slate-50/80 dark:bg-[#0B1524]/60">
                <div className="flex items-center gap-2">
                  <Award className="size-5 text-amber-500" />
                  <div>
                    <h3 id="report-modal-title" className="text-base font-bold text-[#10233F] dark:text-white">
                      Reported Results Data
                    </h3>
                    <p className="text-xs text-slate-500">This report does not certify or independently verify the outcome</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Body: Monospaced Formatted Report View */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed">
                <pre className="whitespace-pre-wrap">{generateReportText()}</pre>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-[#1E3352] px-6 py-4 bg-slate-50 dark:bg-[#0B1524]/60">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Close Preview
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(generateReportText());
                      setCopiedDigest("modal_report");
                      setTimeout(() => setCopiedDigest(null), 2500);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    <Copy className="size-3.5" />
                    {copiedDigest === "modal_report" ? "Report Copied!" : "Copy Report Text"}
                  </button>

                  <button
                    type="button"
                    onClick={downloadAuditReport}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors"
                  >
                    <Download className="size-3.5" />
                    Download File (.txt)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
