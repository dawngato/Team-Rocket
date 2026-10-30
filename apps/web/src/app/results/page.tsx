"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  Flame
} from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election, EvidencePackage, PublishedResults } from "@/lib/types";

export default function PublishedResultsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);
  const [currentElection, setCurrentElection] = useState<Election | null>(null);
  const [results, setResults] = useState<PublishedResults | null>(null);
  const [evidence, setEvidence] = useState<EvidencePackage | null>(null);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedDigest, setCopiedDigest] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void electionClient.getElections().then((nextElections) => {
      if (cancelled) return;
      const published = nextElections.filter((election) => election.state === "PUBLISHED");
      const queryElection = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("election");
      setElections(published);
      setSelectedElectionId((queryElection && published.some((election) => election.id === queryElection)) ? queryElection : published[0]?.id || null);
    }).catch((cause) => {
      if (!cancelled) {
        setError(cause instanceof Error ? cause.message : "Published elections could not be loaded.");
        setElections([]);
      }
    }).finally(() => {
      if (!cancelled) setLoadingDirectory(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedElectionId) return;
    let cancelled = false;
    setLoadingEvidence(true);
    setError(null);
    void Promise.all([
      electionClient.getElection(selectedElectionId),
      electionClient.getResults(selectedElectionId),
      electionClient.getEvidence(selectedElectionId),
    ]).then(([election, nextResults, nextEvidence]) => {
      if (cancelled) return;
      if (election.state !== "PUBLISHED") throw new Error("The selected election is no longer published.");
      setCurrentElection(election);
      setResults(nextResults);
      setEvidence(nextEvidence);
    }).catch((cause) => {
      if (!cancelled) {
        setCurrentElection(null);
        setResults(null);
        setEvidence(null);
        setError(cause instanceof Error ? cause.message : "Published result evidence could not be loaded.");
      }
    }).finally(() => {
      if (!cancelled) setLoadingEvidence(false);
    });
    return () => { cancelled = true; };
  }, [selectedElectionId]);

  const totalVotes = Math.max(results?.total_ballots || 0, 1);
  const tally = useMemo(() => {
    if (!results?.tally) return [];
    return Object.entries(results.tally).sort((a, b) => b[1] - a[1]);
  }, [results]);

  const winner = tally.length > 0 ? tally[0] : null;
  const runnerUp = tally.length > 1 ? tally[1] : null;
  const victoryMargin = winner && runnerUp ? winner[1] - runnerUp[1] : 0;
  const victoryPercentage = winner ? Math.round((winner[1] / totalVotes) * 100) : 0;

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedDigest(label);
    setTimeout(() => setCopiedDigest(null), 2500);
  };

  const downloadEvidence = () => {
    if (!currentElection || !results || !evidence) return;
    const payload = { election: currentElection, results, evidence, export_type: "PUBLIC_RESULT_EVIDENCE" };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `himvote_result_evidence_${currentElection.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 dark:border-[#1E3352] sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 animate-linear-reveal-1">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Official Certified Election Outcome
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white animate-linear-reveal-2">
            Published Election Results
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400 animate-linear-reveal-3">
            Authoritative tallied outcomes verified against independent witness cosignatures and EVM blockchain checkpoints.
          </p>
        </div>

        <button
          type="button"
          disabled={!currentElection || !results || !evidence}
          onClick={downloadEvidence}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#157E92] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0E6273] transition-all disabled:pointer-events-none disabled:opacity-50 animate-linear-reveal-4"
        >
          <Download className="size-4" aria-hidden="true" />
          Export Verifiable Package (JSON)
        </button>
      </header>

      {loadingDirectory && (
        <div className="flex items-center justify-center p-12 rounded-2xl border border-slate-200 bg-white dark:border-[#1E3352] dark:bg-[#132135]">
          <div className="flex flex-col items-center gap-3">
            <div className="size-7 border-2 border-[#157E92] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading certified results...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-6 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
          <p className="font-bold">Result Verification Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!loadingDirectory && !error && elections.length === 0 && (
        <div className="rounded-2xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-8 text-center text-sm text-[#6B4707] dark:text-[#FCD34D]" role="status">
          <p className="font-bold text-base">No Published Results Available Yet</p>
          <p className="mt-1 text-xs">Elections currently in voting or witness certification phases will appear here once finalized.</p>
        </div>
      )}

      {/* Election Selector Tab List */}
      {!loadingDirectory && elections.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Published elections">
          {elections.map((election) => (
            <button
              key={election.id}
              type="button"
              role="tab"
              aria-selected={selectedElectionId === election.id}
              onClick={() => setSelectedElectionId(election.id)}
              className={`min-h-11 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm ${
                selectedElectionId === election.id
                  ? "bg-[#10233F] text-white dark:bg-[#157E92]"
                  : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-[#132135] dark:text-slate-300 border border-slate-200 dark:border-[#1E3352]"
              }`}
            >
              {election.title}
            </button>
          ))}
        </div>
      )}

      {loadingEvidence && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">
          <div className="size-6 border-2 border-[#157E92] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Synchronizing election tally, manifest digests, and evidence proofs...
        </div>
      )}

      {/* Main Results Dashboard Card */}
      {!loadingEvidence && currentElection && results && evidence && (
        <section className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] sm:p-8">
          {/* Contest Overview */}
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-slate-100 pb-6 dark:border-[#1E3352]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#10233F] dark:text-white">
                  {currentElection.title}
                </h2>
                <StateBadge state={currentElection.state} size="md" />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {currentElection.contest || "General Campus Representative"} · Certified {new Date(results.published_at_utc).toLocaleString()}
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50 dark:bg-[#0B1524]/60 px-4 py-2 text-right">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Ballots</span>
                <span className="font-mono text-xl font-extrabold text-[#15805D] dark:text-emerald-400">
                  {results.total_ballots.toLocaleString()}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50 dark:bg-[#0B1524]/60 px-4 py-2 text-right">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Quorum Status</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> Met
                </span>
              </div>
            </div>
          </div>

          {/* Winner Spotlight Banner */}
          {winner && !results.privacy_limited && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent p-6 dark:border-amber-700/60 dark:from-amber-950/40 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg">
                    <Trophy className="size-7" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Winner Declared • Elected
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                        <Flame className="size-3.5" /> Highest Votes
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {winner[0]}
                    </h3>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                      Contest: <span className="font-semibold text-slate-800 dark:text-slate-100">{currentElection.contest || "General Council"}</span>
                    </p>
                  </div>
                </div>

                {/* Victory Stats Pill Cards */}
                <div className="flex items-center gap-3 self-start sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/60 dark:border-amber-900/40">
                  <div className="rounded-xl bg-white/90 dark:bg-[#132135]/90 border border-amber-200 dark:border-amber-800/60 px-4 py-2 text-center shadow-xs">
                    <span className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Total Votes</span>
                    <span className="font-mono text-xl font-black text-amber-600 dark:text-amber-400">{winner[1].toLocaleString()}</span>
                  </div>
                  <div className="rounded-xl bg-white/90 dark:bg-[#132135]/90 border border-amber-200 dark:border-amber-800/60 px-4 py-2 text-center shadow-xs">
                    <span className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Vote Share</span>
                    <span className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">{victoryPercentage}%</span>
                  </div>
                  {runnerUp && (
                    <div className="rounded-xl bg-white/90 dark:bg-[#132135]/90 border border-amber-200 dark:border-amber-800/60 px-4 py-2 text-center shadow-xs">
                      <span className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Winning Margin</span>
                      <span className="font-mono text-xl font-black text-[#157E92] dark:text-[#38BDF8]">+{victoryMargin.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {runnerUp && (
                <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-900/30 text-xs text-slate-600 dark:text-slate-400">
                  Defeated runner-up <span className="font-semibold text-slate-800 dark:text-slate-200">{runnerUp[0]}</span> ({runnerUp[1].toLocaleString()} votes) by a margin of <span className="font-bold text-amber-700 dark:text-amber-300">{victoryMargin.toLocaleString()} votes</span>.
                </div>
              )}
            </div>
          )}

          {results.privacy_limited && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
              <span>Detailed breakdown presentation is privacy limited by institutional policy parameters.</span>
            </div>
          )}

          {/* Graphical Vote Share Bars */}
          {!results.privacy_limited && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <BarChart3 className="size-4 text-[#157E92]" />
                  Candidate Vote Share Distribution
                </h3>
                <span className="text-xs font-mono text-slate-400">Total Valid Ballots: {results.total_ballots}</span>
              </div>

              <div className="space-y-4">
                {tally.map(([candidate, count], idx) => {
                  const percentage = Math.round((count / totalVotes) * 100);
                  const isTop = idx === 0;

                  return (
                    <div key={candidate} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-[#1E3352]/60 dark:bg-[#0B1524]/40">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                            isTop ? "bg-[#157E92] text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-[#10233F] dark:text-white">
                            {candidate}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                            {count.toLocaleString()} votes
                          </span>
                          <span className="rounded bg-[#157E92]/10 px-2 py-0.5 font-mono text-xs font-bold text-[#157E92] dark:text-[#38BDF8]">
                            {percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Smooth Progress Bar */}
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isTop ? "bg-gradient-to-r from-[#157E92] to-[#25B4CF]" : "bg-slate-400 dark:bg-slate-600"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(3, percentage))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cryptographic Ledger & Audit Anchors */}
          <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-[#1E3352]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cryptographic Integrity Proofs
            </h4>
            <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-[#1E3352] dark:bg-slate-900/40">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Manifest Digest</span>
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
                {copiedDigest === "manifest" && <span className="text-[10px] text-emerald-500">Copied!</span>}
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-[#1E3352] dark:bg-slate-900/40">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Final Checkpoint Root</span>
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
                {copiedDigest === "checkpoint" && <span className="text-[10px] text-emerald-500">Copied!</span>}
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-[#1E3352] dark:bg-slate-900/40">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Anchor Transaction</span>
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
                {copiedDigest === "tx" && <span className="text-[10px] text-emerald-500">Copied!</span>}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
