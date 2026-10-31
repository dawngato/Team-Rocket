"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, ShieldCheck } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election, EvidencePackage, PublishedResults } from "@/lib/types";

export default function PublishedResultsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [currentElection, setCurrentElection] = useState<Election | null>(null);
  const [results, setResults] = useState<PublishedResults | null>(null);
  const [evidence, setEvidence] = useState<EvidencePackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void electionClient.getElections().then((summaries) => {
      if (cancelled) return;
      const published = summaries.filter((election) => election.state === "PUBLISHED");
      setElections(published);
      const requested = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("election") || "";
      setSelectedElectionId(requested && published.some((election) => election.id === requested) ? requested : published[0]?.id || "");
      setError(null);
    }).catch(() => {
      if (!cancelled) {
        setElections([]);
        setSelectedElectionId("");
        setError("Published results are temporarily unavailable from the authoritative election service.");
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedElectionId) {
      setCurrentElection(null); setResults(null); setEvidence(null); return;
    }
    let cancelled = false;
    setLoadingDetails(true); setCurrentElection(null); setResults(null); setEvidence(null);
    void Promise.all([
      electionClient.getElection(selectedElectionId),
      electionClient.getResults(selectedElectionId),
      electionClient.getEvidence(selectedElectionId),
    ]).then(([election, nextResults, nextEvidence]) => {
      if (cancelled) return;
      if (election.state !== "PUBLISHED") throw new Error("Election is not published");
      setCurrentElection(election); setResults(nextResults); setEvidence(nextEvidence); setError(null);
    }).catch(() => {
      if (!cancelled) {
        setCurrentElection(null); setResults(null); setEvidence(null);
        setError("The selected published result or its evidence package could not be verified.");
      }
    }).finally(() => { if (!cancelled) setLoadingDetails(false); });
    return () => { cancelled = true; };
  }, [selectedElectionId]);

  const tally = useMemo(() => Object.entries(results?.tally || {}).sort(([, a], [, b]) => b - a), [results]);

  const downloadEvidence = () => {
    if (!currentElection || !results || !evidence) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ election: currentElection, results, evidence }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `himvote_result_evidence_${currentElection.id}.json`; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="space-y-2 border-b border-slate-200 pb-6 dark:border-[#1E3352]">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><ShieldCheck className="size-3.5" aria-hidden="true" /> Authoritative publication registry</div>
        <h1 className="text-3xl font-extrabold text-[#10233F] dark:text-white">Published Election Results</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Results appear only after the election service returns a published result and evidence package.</p>
      </header>
      {error && <div className="flex items-start gap-2 rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}</div>}
      {loading && <p className="text-sm text-slate-500" role="status">Loading the authoritative publication registry…</p>}
      {!loading && elections.length === 0 && !error && <p className="rounded-xl border border-slate-200 p-6 text-sm text-slate-600 dark:border-[#1E3352] dark:text-slate-300" role="status">No published election results are currently available.</p>}
      {elections.length > 0 && <label className="block max-w-xl text-sm font-semibold text-slate-700 dark:text-slate-200">Published election<select value={selectedElectionId} onChange={(event) => setSelectedElectionId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-[#1E3352] dark:bg-[#132135]">{elections.map((election) => <option key={election.id} value={election.id}>{election.title}</option>)}</select></label>}
      {loadingDetails && <p className="text-sm text-slate-500" role="status">Verifying the selected result package…</p>}
      {currentElection && results && evidence && <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><div className="flex flex-wrap items-center justify-between gap-4"><div><StateBadge state={currentElection.state} /><h2 className="mt-3 text-2xl font-bold text-[#10233F] dark:text-white">{currentElection.title}</h2><p className="text-xs text-slate-500">Manifest {results.manifest_digest}</p></div><button type="button" onClick={downloadEvidence} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#157E92] px-4 py-2 text-sm font-bold text-white"><Download className="size-4" aria-hidden="true" /> Download evidence</button></div><div className="grid gap-3 sm:grid-cols-2">{tally.map(([candidate, count]) => <div key={candidate} className="flex items-center justify-between rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900/40"><span className="font-semibold">{candidate}</span><span className="font-mono">{count.toLocaleString()} votes</span></div>)}</div><p className="text-xs text-slate-500">{results.total_ballots.toLocaleString()} ballots · Published {new Date(results.published_at_utc).toLocaleString()}</p></section>}
    </main>
  );
}
