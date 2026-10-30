"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election } from "@/lib/types";

export default function ElectionDetailPage() {
  const params = useParams();
  const electionId = params?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!electionId) return;
    let cancelled = false;
    void electionClient.getElection(electionId)
      .then((nextElection) => {
        if (!cancelled) {
          setElection(nextElection);
          setError(null);
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Election could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [electionId]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <nav className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Link href="/student/elections" className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
          Back to elections
        </Link>
      </nav>

      {loading && (
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 text-sm text-slate-600 dark:text-slate-300" role="status">
          Loading election manifest…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && election && (
        <>
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <StateBadge state={election.state} />
              <span className="font-mono text-xs text-slate-500">{election.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-[#17233B] dark:text-white">{election.title}</h1>
            <p className="text-slate-600 dark:text-slate-400">
              {election.description || "Review the server-authoritative manifest before proceeding."}
            </p>
          </div>

          <div className="grid gap-4">
            <div className="bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] rounded-xl p-6">
              <h2 className="font-bold text-lg mb-4">Election status</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Opens</dt>
                  <dd className="font-medium text-[#17233B] dark:text-white">{election.opens_at_utc || "Not scheduled"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Closes</dt>
                  <dd className="font-medium text-[#17233B] dark:text-white">{election.closes_at_utc || "Not scheduled"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Manifest</dt>
                  <dd className="font-mono text-xs break-all text-[#17233B] dark:text-white">{election.manifest_digest || "Not frozen"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Eligibility</dt>
                  <dd className="font-medium text-[#17233B] dark:text-white">{election.eligible_count ?? "Not published"}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] rounded-xl p-6">
              <h2 className="font-bold text-lg mb-4">Candidates</h2>
              {election.candidates?.length ? (
                <div className="flex flex-col gap-3">
                  {election.candidates.map((candidate) => (
                    <div key={candidate.id} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-[#1E3352] rounded-lg">
                      <span className="size-5 rounded-full border-2 border-[#157E92]" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-slate-700 dark:text-slate-200">{candidate.name}</p>
                        <p className="font-mono text-xs text-slate-500">{candidate.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">No candidate records were returned by the manifest.</p>
              )}
            </div>

            {election.state === "OPEN" ? (
              <Link
                href={`/student/elections/${encodeURIComponent(election.id)}/cast`}
                className="min-h-[44px] px-4 py-3 text-sm font-semibold text-white bg-[#157E92] rounded-lg hover:bg-[#0E6273] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] text-center"
              >
                Open supported voting booth
              </Link>
            ) : (
              <div className="rounded-lg border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="status">
                Casting is unavailable while the server reports state <strong>{election.state}</strong>.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
