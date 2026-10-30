"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, ShieldCheck } from "lucide-react";
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
  const tally = useMemo(() => Object.entries(results?.tally || {}), [results]);

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
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 dark:border-[#1E3352] sm:flex-row sm:items-center"><div><div className="mb-1 inline-flex items-center gap-1.5 rounded bg-[#15805D]/10 px-2.5 py-1 text-xs font-semibold text-[#15805D] dark:text-[#34D399]"><ShieldCheck className="size-3.5" aria-hidden="true" /> Published service result</div><h1 className="text-3xl font-bold tracking-tight text-[#10233F] dark:text-white">Institutional Election Results</h1><p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Only elections returned as PUBLISHED by the authoritative service are shown. This page does not provide independent tally verification by itself.</p></div><button type="button" disabled={!currentElection || !results || !evidence} onClick={downloadEvidence} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#157E92] px-4 py-2 text-sm font-bold text-white hover:bg-[#0E6273] disabled:pointer-events-none disabled:opacity-50"><Download className="size-4" aria-hidden="true" /> Download evidence</button></header>
      {loadingDirectory && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">Loading published elections…</div>}
      {error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">{error} No local result fixture is substituted.</div>}
      {!loadingDirectory && !error && elections.length === 0 && <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="status">No published elections were returned by the authoritative service.</div>}
      {!loadingDirectory && elections.length > 0 && <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2 dark:border-[#1E3352]" role="tablist" aria-label="Published elections">{elections.map((election) => <button key={election.id} type="button" role="tab" aria-selected={selectedElectionId === election.id} onClick={() => setSelectedElectionId(election.id)} className={`min-h-11 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold ${selectedElectionId === election.id ? "bg-[#10233F] text-white dark:bg-[#157E92]" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{election.title}</button>)}</div>}
      {loadingEvidence && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">Loading result, manifest, and evidence…</div>}
      {!loadingEvidence && currentElection && results && evidence && <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] sm:p-8"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold text-[#10233F] dark:text-white">{currentElection.title}</h2><StateBadge state={currentElection.state} size="md" /></div><p className="mt-1 text-xs text-slate-500">{currentElection.contest || "Published contest"} · Published {new Date(results.published_at_utc).toLocaleString()}</p></div><div className="text-left md:text-right"><span className="block text-xs font-semibold uppercase text-slate-400">Total ballots</span><span className="font-mono text-2xl font-extrabold text-[#15805D]">{results.total_ballots.toLocaleString()}</span></div></div>
        {results.privacy_limited && <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" /><span>Detailed tally presentation is privacy limited by the published election policy.</span></div>}
        {!results.privacy_limited && <div className="space-y-4"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Published tally</h3>{tally.map(([candidate, count]) => { const percentage = Math.round((count / totalVotes) * 100); return <div key={candidate} className="space-y-1.5"><div className="flex items-center justify-between text-sm"><span className="font-bold text-[#10233F] dark:text-white">{candidate}</span><span className="font-mono text-xs text-slate-600 dark:text-slate-300">{count.toLocaleString()} votes ({percentage}%)</span></div><div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-[#157E92]" style={{ width: `${Math.min(100, percentage)}%` }} /></div></div>; })}</div>}
        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 text-xs dark:border-[#1E3352] md:grid-cols-3"><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/30"><span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Manifest digest</span><span className="block truncate font-mono text-[11px] text-slate-700 dark:text-slate-300">{currentElection.manifest_digest}</span></div><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/30"><span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Final checkpoint</span><span className="block truncate font-mono text-[11px] font-bold text-[#15805D]">{evidence.final_checkpoint_digest}</span></div><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/30"><span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Anchor transaction</span><span className="block truncate font-mono text-[11px] font-bold text-[#157E92]">{evidence.anchor_tx_hash}</span></div></div>
      </section>}
    </main>
  );
}
