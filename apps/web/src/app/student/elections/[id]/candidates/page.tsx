"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, KeyRound } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election } from "@/lib/types";

export default function CandidateReviewPage() {
  const params = useParams();
  const electionId = params?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!electionId) return;
    let cancelled = false;
    void electionClient.getElection(electionId).then((nextElection) => {
      if (!cancelled) {
        setElection(nextElection);
        setError(null);
      }
    }).catch((cause) => {
      if (!cancelled) {
        setElection(null);
        setError(cause instanceof Error ? cause.message : "The authoritative election manifest could not be loaded.");
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [electionId]);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <nav><Link href={`/student/elections/${encodeURIComponent(electionId)}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-[#1E3352]"><ArrowLeft className="size-4" aria-hidden="true" /> Back to election</Link></nav>
      {loading && <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">Loading the authoritative candidate manifest…</div>}
      {error && <div className="flex items-start gap-2 rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{error} No fixture candidate list is substituted.</div>}
      {!loading && !error && election && (
        <>
          <header className="space-y-2 border-b border-slate-200 pb-6 dark:border-[#1E3352]">
            <div className="flex flex-wrap items-center gap-3"><StateBadge state={election.state} /><span className="font-mono text-xs text-slate-500">{election.id}</span></div>
            <h1 className="text-3xl font-bold tracking-tight text-[#10233F] dark:text-white">{election.title}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{election.contest || "Manifest candidates"} · {election.selection_rule || "Selection rule supplied by the manifest"}</p>
          </header>

          <section className="space-y-4" aria-labelledby="candidate-heading">
            <div><h2 id="candidate-heading" className="text-xl font-bold text-[#10233F] dark:text-white">Manifest candidates</h2><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">These records are read-only and come from the same manifest used for the supported engine handoff.</p></div>
            {election.candidates?.length ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {election.candidates.map((candidate) => (
                    <article
                      key={candidate.id}
                      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative size-16 rounded-xl overflow-hidden border-2 border-[#157E92] shrink-0 shadow-md bg-slate-100 dark:bg-slate-800">
                          <div className="flex size-full items-center justify-center bg-[#157E92]/10 font-bold text-lg text-[#157E92]">
                            {candidate.name.charAt(0)}
                          </div>
                          <div className="absolute bottom-0 right-0 px-1.5 py-0.5 rounded text-[7px] font-bold bg-[#157E92] text-white">
                            Candidate
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-[#10233F] dark:text-white truncate">
                              {candidate.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-1">
                            <span>ID: {candidate.id.substring(0, 12)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-300">
                        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
                          Platform &amp; Manifesto Pledges:
                        </p>
                        <p>{candidate.statement || "No statement was included in the authoritative manifest."}</p>
                      </div>
                    </article>
                ))}
              </div>
            ) : <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="status">The authoritative manifest did not return any candidates. Casting is blocked.</div>}
          </section>

          {election.state === "OPEN" && Boolean(election.candidates?.length) ? <section className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-[#1E3352] dark:bg-[#132135] sm:flex-row sm:items-center"><div><h2 className="font-bold text-[#10233F] dark:text-white">Use the supported engine booth</h2><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">The next step will not create a local token or plaintext ballot.</p></div><Link href={`/student/elections/${encodeURIComponent(election.id)}/credential`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#157E92] px-4 py-2 text-sm font-bold text-white hover:bg-[#0E6273] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"><KeyRound className="size-4" aria-hidden="true" /> Continue to credential handoff <ArrowRight className="size-4" aria-hidden="true" /></Link></section> : <div className="flex items-start gap-2 rounded-lg border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-xs text-[#6B4707] dark:text-[#FCD34D]" role="status"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Casting is unavailable until the authoritative election is open and has candidates.</div>}
        </>
      )}
    </main>
  );
}
