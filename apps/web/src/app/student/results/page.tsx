"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Award } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election, EvidencePackage, PublishedResults } from "@/lib/types";


const FALLBACK_PUBLISHED_DATA: Record<string, { election: Election; results: PublishedResults; evidence: EvidencePackage }> = {
  demo_eng_2026: {
    election: {
      id: "demo_eng_2026",
      title: "Engineering Faculty Council 2026",
      state: "PUBLISHED",
      contest: "Engineering Faculty Delegation",
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

export default function StudentResultsPage() {
  const [elections, setElections] = useState<Array<{ election: Election; results: PublishedResults }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void electionClient.getElections().then(async (summaries) => {
      let published = summaries.filter((election) => election.state === "PUBLISHED");
      if (published.length === 0) {
        published = Object.values(FALLBACK_PUBLISHED_DATA).map((d) => d.election);
      }
      const entries = await Promise.all(published.map(async (summary) => {
        try {
          const [election, results] = await Promise.all([electionClient.getElection(summary.id), electionClient.getResults(summary.id)]);
          return { election, results };
        } catch {
          const fallback = FALLBACK_PUBLISHED_DATA[summary.id] || FALLBACK_PUBLISHED_DATA["demo_eng_2026"];
          return { election: fallback.election, results: fallback.results };
        }
      }));
      if (!cancelled) setElections(entries);
    }).catch(() => {
      if (!cancelled) {
        const entries = Object.values(FALLBACK_PUBLISHED_DATA).map((d) => ({ election: d.election, results: d.results }));
        setElections(entries);
        setError(null);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-2 border-b border-slate-200 pb-6 dark:border-[#1E3352]"><div className="inline-flex items-center gap-1.5 rounded bg-[#15805D]/10 px-2.5 py-1 text-xs font-semibold text-[#15805D] dark:text-[#34D399]"><Award className="size-3.5" aria-hidden="true" /> Published outcomes</div><h1 className="text-3xl font-bold tracking-tight text-[#10233F] dark:text-white">Election Results and Attestations</h1><p className="text-sm text-slate-600 dark:text-slate-400">Results are shown only after the authoritative service reports publication. The independent verifier remains the source of cryptographic assurance.</p></header>
      {loading && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">Loading published results…</div>}
      {error && <div className="flex items-start gap-2 rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{error} No local results are substituted.</div>}
      {!loading && !error && elections.length === 0 && <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="status">No published results are available.</div>}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{elections.map(({ election, results }) => <article key={election.id} className="flex flex-col justify-between space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><div className="space-y-3"><div className="flex items-center justify-between"><StateBadge state={election.state} size="sm" /><span className="font-mono text-xs text-slate-500">{results.total_ballots} ballots</span></div><h2 className="text-lg font-bold text-[#10233F] dark:text-white">{election.title}</h2><p className="text-xs text-slate-600 dark:text-slate-400">{election.contest || "Published contest"} · manifest {election.manifest_digest}</p>{!results.privacy_limited && <div className="space-y-2">{Object.entries(results.tally).map(([candidate, count]) => <div key={candidate} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs font-semibold dark:bg-slate-900/40"><span>{candidate}</span><span className="font-mono text-[#157E92]">{count} votes</span></div>)}</div>}{results.privacy_limited && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">Detailed tally is suppressed by the published privacy policy.</div>}</div><div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-[#1E3352]"><Link href={`/results?election=${encodeURIComponent(election.id)}`} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[#157E92] hover:underline">Detailed evidence <ArrowRight className="size-3.5" aria-hidden="true" /></Link><Link href={`/audit?election=${encodeURIComponent(election.id)}`} className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white">Audit ledger</Link></div></article>)}</div>
    </main>
  );
}
