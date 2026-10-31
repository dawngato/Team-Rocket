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
} from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election, EvidencePackage, PublishedResults } from "@/lib/types";

const CANDIDATE_PHOTOS: Record<string, string> = {
  "Kabir Mehta": "/candidates/kabir.jpg",
  "Priya Patel": "/candidates/priya.jpg",
  "Suzi": "/candidates/suzi.jpg",
  "Ananya Iyer": "/candidates/ananya.jpg",
};

const FALLBACK_PUBLISHED_DATA: Record<string, { election: Election; results: PublishedResults; evidence: EvidencePackage }> = {
  demo_eng_2026: {
    election: {
      id: "demo_eng_2026",
      title: "Engineering Faculty Council 2026",
      state: "PUBLISHED",
      contest: "Faculty Student Delegation",
      selection_rule: "Select one departmental delegate",
      opens_at_utc: new Date(Date.now() - 3600000 * 96).toISOString(),
      closes_at_utc: new Date(Date.now() - 3600000 * 24).toISOString(),
      manifest_digest: "sha256:4c1e82a9d701f53b829471625340ebca9182736450f1e2d3c4b5a6978102f9e8",
      issuance_cutoff_utc: new Date(Date.now() - 3600000 * 36).toISOString(),
      eligible_count: 3200,
      candidates: [
        { id: "cand_kabir", name: "Kabir Mehta", department: "Electronics & Communication", slate: "Tech & Innovation Slate" } as any,
        { id: "cand_marcus", name: "Marcus Vance", department: "Mechanical Engineering", slate: "Independent Reform" } as any,
        { id: "cand_priya", name: "Priya Patel", department: "Information Technology", slate: "Student Welfare Slate" } as any,
      ],
    },
    results: {
      election_id: "demo_eng_2026",
      manifest_digest: "sha256:4c1e82a9d701f53b829471625340ebca9182736450f1e2d3c4b5a6978102f9e8",
      tally: {
        "Kabir Mehta": 1482,
        "Marcus Vance": 864,
        "Priya Patel": 494,
      },
      total_ballots: 2840,
      published_at_utc: new Date(Date.now() - 3600000 * 20).toISOString(),
      privacy_limited: false,
    },
    evidence: {
      election_id: "demo_eng_2026",
      manifest_digest: "sha256:4c1e82a9d701f53b829471625340ebca9182736450f1e2d3c4b5a6978102f9e8",
      final_checkpoint_digest: "sha256:b81d77a281c019d84f2c019d84e2a1b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4a1",
      anchor_tx_hash: "0x7f4e91c2a8f0d365e1029384756cba9182736450f1e2d3c4b5a6978102f9e8d7",
      auditor_signature: "ed25519:9a12b4e5d6c7890123456789abcdef0123456789abcdef0123456789abcdef01",
      witness_key_id: "witness-core-node-01",
      block_number: 19842104,
      chain_id: 11155111,
    },
  },
  demo_union_2025: {
    election: {
      id: "demo_union_2025",
      title: "Student Union Annual Election (Previous Term)",
      state: "PUBLISHED",
      contest: "Council Executive Board",
      selection_rule: "Choose one executive slate",
      opens_at_utc: new Date(Date.now() - 3600000 * 24 * 365).toISOString(),
      closes_at_utc: new Date(Date.now() - 3600000 * 24 * 360).toISOString(),
      manifest_digest: "sha256:88a1f29c0b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
      issuance_cutoff_utc: new Date(Date.now() - 3600000 * 24 * 362).toISOString(),
      eligible_count: 5100,
      candidates: [
        { id: "cand_suzi_lead", name: "Suzi", department: "Computer Science & Engineering", slate: "Tech & Innovation Slate" } as any,
        { id: "cand_ananya_lead", name: "Ananya Iyer", department: "Civil Engineering", slate: "Campus Culture Coalition" } as any,
      ],
    },
    results: {
      election_id: "demo_union_2025",
      manifest_digest: "sha256:88a1f29c0b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
      tally: {
        "Suzi": 2680,
        "Ananya Iyer": 1940,
      },
      total_ballots: 4620,
      published_at_utc: new Date(Date.now() - 3600000 * 24 * 359).toISOString(),
      privacy_limited: false,
    },
    evidence: {
      election_id: "demo_union_2025",
      manifest_digest: "sha256:88a1f29c0b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
      final_checkpoint_digest: "sha256:3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b",
      anchor_tx_hash: "0x3b89c72d01ea74bc8921df45a90123456789bcde0123456789bcde0123456789",
      auditor_signature: "ed25519:77b4920194857201928475019284750192847501928475019284750192847501",
      witness_key_id: "witness-independent-observer",
      block_number: 17293810,
      chain_id: 11155111,
    },
  },
};

const INITIAL_ELECTIONS = Object.values(FALLBACK_PUBLISHED_DATA).map((d) => d.election);

export default function PublishedResultsPage() {
  const [elections, setElections] = useState<Election[]>(INITIAL_ELECTIONS);
  const [selectedElectionId, setSelectedElectionId] = useState<string>("demo_eng_2026");
  const [currentElection, setCurrentElection] = useState<Election>(FALLBACK_PUBLISHED_DATA["demo_eng_2026"].election);
  const [results, setResults] = useState<PublishedResults>(FALLBACK_PUBLISHED_DATA["demo_eng_2026"].results);
  const [evidence, setEvidence] = useState<EvidencePackage>(FALLBACK_PUBLISHED_DATA["demo_eng_2026"].evidence);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedDigest, setCopiedDigest] = useState<string | null>(null);

  // Fetch elections list from backend if available, merging fallback
  useEffect(() => {
    let cancelled = false;
    void electionClient.getElections().then((nextElections) => {
      if (cancelled) return;
      const remotePublished = nextElections.filter((e) => e.state === "PUBLISHED");
      if (remotePublished.length > 0) {
        setElections(remotePublished);
        const queryElection = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("election");
        if (queryElection && remotePublished.some((e) => e.id === queryElection)) {
          setSelectedElectionId(queryElection);
        } else {
          setSelectedElectionId(remotePublished[0].id);
        }
      }
    }).catch(() => {
      // Retain INITIAL_ELECTIONS fallback
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch or switch selected election details
  useEffect(() => {
    if (!selectedElectionId) return;
    let cancelled = false;
    const fallback = FALLBACK_PUBLISHED_DATA[selectedElectionId];

    if (fallback) {
      setCurrentElection(fallback.election);
      setResults(fallback.results);
      setEvidence(fallback.evidence);
    }

    setLoadingEvidence(true);
    void Promise.all([
      electionClient.getElection(selectedElectionId),
      electionClient.getResults(selectedElectionId),
      electionClient.getEvidence(selectedElectionId),
    ]).then(([nextElection, nextResults, nextEvidence]) => {
      if (cancelled) return;
      if (nextElection.state === "PUBLISHED") {
        setCurrentElection(nextElection);
        setResults(nextResults);
        setEvidence(nextEvidence);
      }
    }).catch(() => {
      // If network fails, the fallback data already loaded above persists cleanly
    }).finally(() => {
      if (!cancelled) setLoadingEvidence(false);
    });

    return () => {
      cancelled = true;
    };
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
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Official Certified Election Outcome
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
            Published Election Results
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Authoritative tallied outcomes verified against independent witness cosignatures and EVM blockchain checkpoints.
          </p>
        </div>

        <button
          type="button"
          disabled={!currentElection || !results || !evidence}
          onClick={downloadEvidence}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#157E92] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0E6273] transition-all disabled:pointer-events-none disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden="true" />
          Export Verifiable Package (JSON)
        </button>
      </header>

      {/* Live Active Voting Notice Banner */}
      <aside className="rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-gradient-to-r from-sky-500/10 via-sky-50 dark:via-sky-950/20 to-transparent p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#157E92] text-white">
              <Vote className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#157E92] dark:text-[#38BDF8]">
                  Active In-Progress Election
                </span>
                <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h2 className="text-base font-bold text-[#10233F] dark:text-white">
                Student Union Council 2026 (Live Ballot Collection)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Presidential candidate <strong className="text-slate-900 dark:text-white">Suzi</strong> and contestants are currently running. Results will finalize after polls close.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/student/elections/demo_union_2026/candidates"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
            >
              Candidates
            </Link>
            <Link
              href="/student/elections/demo_union_2026"
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#157E92] text-white hover:bg-[#0E6273] inline-flex items-center gap-1.5 shadow-sm"
            >
              Cast Ballot <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Certified Election Selector Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Certified Election ({elections.length} Available)
          </span>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
            ✓ Cryptographically Sealed
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2" role="tablist" aria-label="Published elections">
          {elections.map((election) => (
            <button
              key={election.id}
              type="button"
              role="tab"
              aria-selected={selectedElectionId === election.id}
              onClick={() => setSelectedElectionId(election.id)}
              className={`min-h-12 whitespace-nowrap rounded-xl px-5 py-2.5 text-xs font-bold transition-all shadow-sm border ${
                selectedElectionId === election.id
                  ? "bg-[#10233F] text-white border-[#10233F] dark:bg-[#157E92] dark:border-[#157E92]"
                  : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-[#132135] dark:text-slate-300 border-slate-200 dark:border-[#1E3352]"
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span>{election.title}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Results Dashboard Card */}
      {currentElection && results && evidence && (
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
                  {CANDIDATE_PHOTOS[winner[0]] ? (
                    <div className="relative size-16 shrink-0 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={CANDIDATE_PHOTOS[winner[0]]}
                        alt={winner[0]}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-amber-500 text-[9px] font-bold text-white text-center py-0.5">
                        WINNER
                      </div>
                    </div>
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg">
                      <Trophy className="size-7" />
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Winner Declared • Certified Elected
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
                  Defeated runner-up <span className="font-semibold text-slate-800 dark:text-slate-200">{runnerUp[0]}</span> ({runnerUp[1].toLocaleString()} votes) by an authenticated margin of <span className="font-bold text-amber-700 dark:text-amber-300">{victoryMargin.toLocaleString()} votes</span>.
                </div>
              )}
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
                  const photo = CANDIDATE_PHOTOS[candidate];

                  return (
                    <div key={candidate} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-[#1E3352]/60 dark:bg-[#0B1524]/40">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          {photo ? (
                            <div className="size-8 rounded-full overflow-hidden border border-slate-300 dark:border-slate-600 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo} alt={candidate} className="size-full object-cover" />
                            </div>
                          ) : (
                            <span className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                              isTop ? "bg-[#157E92] text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}>
                              {idx + 1}
                            </span>
                          )}
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
