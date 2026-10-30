"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election } from "@/lib/types";

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
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Elections could not be loaded.");
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
      <h1 className="text-2xl font-bold text-[#17233B] dark:text-white mb-2">My Elections</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">View elections returned by the authoritative election service.</p>

      {loading && (
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 text-sm text-slate-600 dark:text-slate-300" role="status">
          Loading eligible elections…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="alert">
          {error} Synthetic elections are not substituted in this student flow.
        </div>
      )}

      {!loading && !error && elections.length === 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 text-sm text-slate-600 dark:text-slate-300" role="status">
          No eligible elections are available.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {elections.map((e) => (
          <article key={e.id} className="bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#17233B] dark:text-white">{e.title}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {e.candidates?.length ? `${e.candidates.length} candidates` : "Candidate details available after opening"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StateBadge state={e.state} showDescription />
                <Link
                  href={`/student/elections/${e.id}`}
                  className="min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-[#157E92] rounded-lg hover:bg-[#0E6273] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
                >
                  {e.state === "OPEN" ? "Vote now" : "View details"}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
