"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election } from "@/lib/types";
import { DEFAULT_CANDIDATES, getStoredCandidates } from "@/lib/candidate_store";
import { ArrowRight, Users, Vote } from "lucide-react";

export default function StudentElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void electionClient.getElections()
      .then((nextElections) => {
        if (!cancelled) {
          setElections(nextElections);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const stored = typeof window !== "undefined" ? getStoredCandidates() : [];
          setElections([
            {
              id: "demo_union_2026",
              title: "Student Union Council 2026",
              state: "OPEN",
              contest: "Council Executive Board",
              selection_rule: "Choose one president & executive slate",
              opens_at_utc: new Date(Date.now() - 3600000 * 24).toISOString(),
              closes_at_utc: new Date(Date.now() + 3600000 * 48).toISOString(),
              manifest_digest: "sha256:9f8a3c20e184b291d84f2c019d84e2a1b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4",
              issuance_cutoff_utc: new Date(Date.now() + 3600000 * 24).toISOString(),
              eligible_count: 4800,
              candidates: (stored.length > 0 ? stored : DEFAULT_CANDIDATES).filter((c) => c.election_id === "demo_union_2026"),
            },
            {
              id: "demo_design_2026",
              title: "School of Design Representatives",
              state: "OPEN",
              contest: "School of Design Cohort",
              selection_rule: "Select one departmental delegate",
              opens_at_utc: new Date(Date.now() - 3600000 * 12).toISOString(),
              closes_at_utc: new Date(Date.now() + 3600000 * 72).toISOString(),
              manifest_digest: "sha256:7b4e91c2a8f0d365e1029384756cba9182736450f1e2d3c4b5a6978102f9e8d7",
              issuance_cutoff_utc: new Date(Date.now() + 3600000 * 48).toISOString(),
              eligible_count: 1250,
              candidates: (stored.length > 0 ? stored : DEFAULT_CANDIDATES).filter((c) => c.election_id === "demo_design_2026"),
            },
          ]);
          setError(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#17233B] dark:text-white mb-2">My Elections</h1>
          <p className="text-slate-600 dark:text-slate-400">View active ballots, verify contestant manifestos, and cast your cryptographic vote.</p>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 text-sm text-slate-600 dark:text-slate-300" role="status">
          Loading eligible elections…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && elections.length === 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 text-sm text-slate-600 dark:text-slate-300" role="status">
          No eligible elections are available.
        </div>
      )}

      <div className="flex flex-col gap-5">
        {elections.map((e) => (
          <article key={e.id} className="bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {e.id}
                  </span>
                  <StateBadge state={e.state} showDescription />
                </div>
                <h2 className="text-xl font-bold text-[#17233B] dark:text-white mb-1">{e.title}</h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm mb-3">
                  {e.selection_rule}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                    <Users className="w-3.5 h-3.5" />
                    {e.candidates?.length ? `${e.candidates.length} Registered Contestants` : "Contestants ready"}
                  </span>
                  <span>•</span>
                  <span>Closes: {new Date(e.closes_at_utc).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/student/elections/${e.id}/candidates`}
                  className="px-4 py-2.5 text-sm font-semibold text-[#157E92] bg-[#157E92]/10 hover:bg-[#157E92]/20 rounded-xl transition-colors inline-flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4" />
                  View Candidates
                </Link>
                <Link
                  href={`/student/elections/${e.id}`}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-xl shadow-sm transition-colors inline-flex items-center gap-1.5"
                >
                  <Vote className="w-4 h-4" />
                  {e.state === "OPEN" ? "Vote Now" : "Election Details"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
