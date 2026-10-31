"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api_client";
import type { Candidate, CandidateDraft, Election } from "@/lib/types";

export default function AdminCandidatesPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [electionId, setElectionId] = useState("");
  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [name, setName] = useState("");
  const [statement, setStatement] = useState("");
  const [loadingElections, setLoadingElections] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiClient.getElections({ includeInternal: true }).then((rows) => {
      if (!active) return;
      setElections(rows);
      setElectionId(rows[0]?.id || "");
      setError(null);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "The scoped election list could not be loaded.");
    }).finally(() => {
      if (active) setLoadingElections(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!electionId) {
      setElection(null);
      setCandidates([]);
      return;
    }
    let active = true;
    setLoadingCandidates(true);
    void Promise.all([
      apiClient.getElection(electionId, { includeInternal: true }),
      apiClient.getCandidates(electionId),
    ]).then(([nextElection, nextCandidates]) => {
      if (!active) return;
      if (!nextElection) throw new Error("The election is not available in your assigned scope.");
      setElection(nextElection);
      setCandidates(nextCandidates);
      setError(null);
    }).catch((cause) => {
      if (!active) return;
      setElection(null);
      setCandidates([]);
      setError(cause instanceof Error ? cause.message : "Candidate records could not be loaded.");
    }).finally(() => {
      if (active) setLoadingCandidates(false);
    });
    return () => { active = false; };
  }, [electionId]);

  const persistCandidates = async (next: CandidateDraft[]) => {
    if (!electionId) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await apiClient.replaceCandidates(electionId, next);
      setCandidates(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The election service rejected this candidate update.");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !election) return;
    const candidate: CandidateDraft = {
      name: name.trim(),
      contest: election.contest || election.title,
      statement: statement.trim(),
    };
    await persistCandidates([...candidates, candidate]);
    setName("");
    setStatement("");
  };

  const editable = election?.state === "DRAFT";

  return (
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/admin" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#157E92] dark:text-slate-300">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to administration
      </Link>

      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end dark:border-[#1E3352]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#157E92]">Election setup</p>
          <h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white">Candidate rosters</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Candidate changes are saved to the election service and become read-only when the manifest is frozen.</p>
        </div>
        <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Select an assigned election
          <select
            value={electionId}
            onChange={(event) => setElectionId(event.target.value)}
            disabled={loadingElections || elections.length === 0}
            className="min-h-11 min-w-64 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-[#1E3352] dark:bg-[#132135] dark:text-white"
          >
            {elections.length === 0 && <option value="">No assigned elections</option>}
            {elections.map((row) => <option key={row.id} value={row.id}>{row.title} · {row.state}</option>)}
          </select>
        </label>
      </header>

      {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{error}</div>}
      {loadingElections && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">Loading assigned elections…</p>}
      {!loadingElections && !error && elections.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">No elections are available in your assigned scope.</p>}

      {election && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-[#1E3352] dark:bg-[#132135]">
            <div><h2 className="font-semibold text-[#10233F] dark:text-white">{election.title}</h2><p className="mt-1 text-xs text-slate-500">{election.id} · {election.state}</p></div>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-[#1E3352] dark:text-slate-300">{candidates.length} candidates</span>
          </div>

          {!editable && <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" role="status"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />The authoritative election state is {election.state}. Candidate edits are locked.</div>}

          {editable && <form onSubmit={handleAdd} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] md:grid-cols-[1fr_2fr_auto] md:items-end">
            <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Candidate name<input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 text-sm text-slate-900 dark:border-[#1E3352] dark:text-white" /></label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Candidate statement<textarea rows={2} maxLength={5000} value={statement} onChange={(event) => setStatement(event.target.value)} className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-900 dark:border-[#1E3352] dark:text-white" /></label>
            <button type="submit" disabled={saving || loadingCandidates} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#157E92] px-4 text-sm font-semibold text-white hover:bg-[#0E6273] disabled:opacity-50"><Plus className="size-4" aria-hidden="true" />Add candidate</button>
          </form>}

          {loadingCandidates ? <p className="py-8 text-center text-sm text-slate-500" role="status">Loading authoritative candidate roster…</p> : (
            <section className="space-y-3" aria-label="Authoritative candidate roster">
              {candidates.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-[#1E3352]">No candidates are registered for this election.</p>}
              {candidates.map((candidate) => <article key={candidate.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-[#1E3352] dark:bg-[#132135]">
                <div className="min-w-0"><h3 className="font-semibold text-[#10233F] dark:text-white">{candidate.name}</h3><p className="mt-1 text-xs text-slate-500">{candidate.contest}</p>{candidate.statement && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{candidate.statement}</p>}<p className="mt-2 font-mono text-[10px] text-slate-400">{candidate.id}</p></div>
                {editable && <button type="button" disabled={saving} onClick={() => void persistCandidates(candidates.filter((item) => item.id !== candidate.id))} aria-label={`Remove ${candidate.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-950/30"><Trash2 className="size-4" aria-hidden="true" /></button>}
              </article>)}
            </section>
          )}
        </>
      )}
    </main>
  );
}
