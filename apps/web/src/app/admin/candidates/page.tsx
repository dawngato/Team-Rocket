"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api_client";
import type { Candidate, Election } from "@/lib/types";

export default function AdminCandidatesPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [name, setName] = useState("");
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedElection = useMemo(() => elections.find((election) => election.id === selectedId) || null, [elections, selectedId]);

  useEffect(() => {
    let active = true;
    void apiClient.getElections({ includeInternal: true }).then((next) => {
      if (!active) return;
      setElections(next.filter((election) => election.state === "DRAFT" || election.state === "REVIEW" || election.state === "APPROVED"));
      setSelectedId(next[0]?.id || "");
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Election service unavailable."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) { setCandidates([]); return; }
    let active = true;
    setBusy(true);
    void apiClient.getCandidates(selectedId).then((next) => { if (active) { setCandidates(next); setError(null); } }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Candidate records unavailable."); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [selectedId]);

  const persist = async (next: Candidate[]) => {
    if (!selectedId || selectedElection?.state !== "DRAFT") return;
    setBusy(true); setError(null);
    try { setCandidates(await apiClient.replaceCandidates(selectedId, next)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The candidate change was rejected by the election service."); }
    finally { setBusy(false); }
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !selectedElection) return;
    await persist([...candidates, { id: "", name: name.trim(), contest: selectedElection.contest || selectedElection.title, statement: statement.trim() }]);
    setName(""); setStatement("");
  };

  return <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
    <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#157E92]"><ArrowLeft className="size-4" />Back to administrator console</Link>
    <header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]"><p className="text-xs font-bold uppercase tracking-wider text-[#157E92]">Authoritative nomination registry</p><h1 className="mt-2 text-3xl font-extrabold text-[#10233F] dark:text-white">Election candidates</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Candidate changes are submitted to the scoped election service. Browser storage and fabricated verification states are not used.</p></header>
    {error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">{error}</div>}
    {loading ? <p className="text-sm text-slate-500" role="status">Loading assigned elections…</p> : <>
      <label className="block text-sm font-semibold">Draft election<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 dark:border-[#1E3352]">{elections.length === 0 && <option value="">No mutable elections</option>}{elections.map((election) => <option key={election.id} value={election.id}>{election.title} · {election.state}</option>)}</select></label>
      {selectedElection?.state !== "DRAFT" && selectedElection && <p className="rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">Candidate changes are locked until the server reports DRAFT.</p>}
      {selectedElection?.state === "DRAFT" && <form onSubmit={(event) => void add(event)} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] sm:grid-cols-[1fr_2fr_auto]"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Candidate name" className="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 text-sm" /><input required value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="Official platform statement" className="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 text-sm" /><button disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#157E92] px-4 text-sm font-bold text-white disabled:opacity-50"><Plus className="size-4" />Add</button></form>}
      <section className="space-y-3"><h2 className="text-xl font-bold text-[#10233F] dark:text-white">Server candidates ({candidates.length})</h2>{candidates.length === 0 ? <p className="rounded-xl border border-slate-200 p-6 text-sm text-slate-500 dark:border-[#1E3352]">No candidates returned by the election service.</p> : candidates.map((candidate) => <article key={candidate.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-[#1E3352] dark:bg-[#132135]"><div><h3 className="font-bold text-[#10233F] dark:text-white">{candidate.name}</h3><p className="mt-1 text-xs text-slate-500">{candidate.contest}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{candidate.statement || "No platform statement returned."}</p><p className="mt-2 font-mono text-[11px] text-slate-400">Server ID {candidate.id}</p></div>{selectedElection?.state === "DRAFT" && <button type="button" disabled={busy} onClick={() => void persist(candidates.filter((item) => item.id !== candidate.id))} className="rounded-lg p-2 text-slate-400 hover:text-[#C23C45] disabled:opacity-50" aria-label={`Remove ${candidate.name}`}><Trash2 className="size-4" /></button>}</article>)}</section>
    </>}
  </main>;
}
