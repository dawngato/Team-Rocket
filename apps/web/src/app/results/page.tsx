"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Globe,
  FileText,
  Lock,
  ArrowRight,
} from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { INITIAL_ELECTIONS, INITIAL_RESULTS, INITIAL_EVIDENCE } from "@/lib/mock_data";

export default function PublishedResultsPage() {
  const publishedElections = INITIAL_ELECTIONS.filter(
    (e) =>
      e.state === "PUBLISHED"
  );

  const [selectedElectionId, setSelectedElectionId] = useState(publishedElections[0]?.id || "elec_cs_2026");

  const currentElection =
    publishedElections.find((e) => e.id === selectedElectionId) || publishedElections[0];

  const resultsData = INITIAL_RESULTS[currentElection.id] || {
    election_id: currentElection.id,
    manifest_digest: currentElection.manifest_digest,
    tally: { "Aarav Sharma": 1840, "Priya Nair": 1420, "Kabir Verma": 990 },
    total_ballots: 4250,
    published_at_utc: "2026-10-30T12:00:00Z",
    privacy_limited: false,
  };

  const evidenceData = INITIAL_EVIDENCE[currentElection.id] || {
    election_id: currentElection.id,
    manifest_digest: currentElection.manifest_digest,
    final_checkpoint_digest: "deb3384abb0306e861b04a6e760e9fa992f25a5632507a91454a49538880a7e5",
    anchor_tx_hash: "0x4f82a93c7210e395b018c47f89a2b6d19e04c8f2a573b9e1a82649d038271e9a",
    auditor_signature: "development_fixture_signature_reference",
  };

  const totalVotes = resultsData.total_ballots || 1;

  const handleDownloadEvidenceSummary = () => {
    const evidenceSummary = {
      institution: "Himachal Pradesh Technical University",
      platform: "HimVote Cryptographic Election System",
      election_id: currentElection.id,
      title: currentElection.title,
      contest: currentElection.contest,
      state: currentElection.state,
      manifest_digest: currentElection.manifest_digest,
      final_checkpoint_root: evidenceData.final_checkpoint_digest,
      anchor_tx_hash: evidenceData.anchor_tx_hash,
      total_ballots: resultsData.total_ballots,
      tally: resultsData.tally,
      attested_at_utc: resultsData.published_at_utc,
      status: "DEVELOPMENT_EVIDENCE_SUMMARY",
    };
    const blob = new Blob([JSON.stringify(evidenceSummary, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `himvote_evidence_summary_${currentElection.id}.json`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Published Development Tallies
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Institutional Election Results
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            These sample tallies are shown with their current evidence state. Independent engine verification and production witness finality remain required before live publication.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadEvidenceSummary}
          className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span>Download Evidence Summary</span>
        </button>
      </div>

      {/* Election Switcher Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-[#1E3352]">
        {publishedElections.map((elec) => {
          const isActive = elec.id === selectedElectionId;
          return (
            <button
              key={elec.id}
              type="button"
              onClick={() => setSelectedElectionId(elec.id)}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] ${
                isActive
                  ? "bg-[#10233F] text-white dark:bg-[#157E92] shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {elec.title}
            </button>
          );
        })}
      </div>

      {/* Election Header Card */}
      <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-[#10233F] dark:text-white">
                {currentElection.title}
              </h2>
              <StateBadge state={currentElection.state} size="md" />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Contest: <strong>{currentElection.contest}</strong> | Rule: <strong>{currentElection.selection_rule}</strong>
            </p>
          </div>
          <div className="text-left md:text-right">
            <span className="text-xs text-slate-400 block font-semibold uppercase">Total Ballots Cast</span>
            <span className="text-2xl font-extrabold text-[#15805D]">{resultsData.total_ballots.toLocaleString()}</span>
          </div>
        </div>

        {/* Privacy Notice if Applicable */}
        {resultsData.privacy_limited && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong>Privacy Limited Suppression Notice:</strong> Total turnout for this sub contest was below the minimum anonymity threshold of 20 voters. Individual candidate vote breakdown is suppressed to preserve voter privacy per institutional policy.
            </div>
          </div>
        )}

        {/* Tally Breakdown Bars */}
        {!resultsData.privacy_limited ? (
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Vote Breakdown in Sample Data
            </h3>
            {Object.entries(resultsData.tally).map(([candidate, count]) => {
              const percentage = Math.round((count / totalVotes) * 100);
              return (
                <div key={candidate} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-[#10233F] dark:text-white">
                      {candidate}
                    </span>
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                      {count.toLocaleString()} votes ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-[#157E92] h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/50 dark:bg-slate-900/30 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Detailed Tallies Suppressed for Anonymity Protection</p>
            <p>Total validated ballots: {resultsData.total_ballots}. Quorum confirmed satisfied.</p>
          </div>
        )}

        {/* Cryptographic Proof Verification Bar */}
        <div className="pt-6 border-t border-slate-100 dark:border-[#1E3352] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 space-y-1">
            <span className="text-[10px] uppercase font-sans text-slate-400 font-semibold block">Manifest Digest</span>
            <span className="text-slate-700 dark:text-slate-300 truncate block text-[11px]">{currentElection.manifest_digest}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 space-y-1">
            <span className="text-[10px] uppercase font-sans text-slate-400 font-semibold block">Final Witness Checkpoint</span>
            <span className="text-[#15805D] truncate block text-[11px] font-bold">{evidenceData.final_checkpoint_digest}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 space-y-1">
            <span className="text-[10px] uppercase font-sans text-slate-400 font-semibold block">Blockchain Anchor Tx</span>
            <span className="text-[#157E92] truncate block text-[11px] font-bold">{evidenceData.anchor_tx_hash}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
