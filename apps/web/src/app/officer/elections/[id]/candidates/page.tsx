"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { StateBadge } from "../../../../components/StateBadge";
import { apiClient } from "../../../../lib/api_client";
import type { Candidate, Election } from "../../../../lib/types";

export default function OfficerCandidateManagementPage() {
  const params = useParams();
  const electionId = params?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candName, setCandName] = useState("");
  const [statement, setStatement] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!electionId) return;
    void Promise.all([apiClient.getElection(electionId), apiClient.getCandidates(electionId)]).then(([nextElection, nextCandidates]) => {
      if (!nextElection) throw new Error("Election not found in the admin service.");
      setElection(nextElection);
      setCandidates(nextCandidates);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Candidate roster could not be loaded."));
  }, [electionId]);

  const replace = async (next: Candidate[]) => {
    setBusy(true); setError(null);
    try { setCandidates(await apiClient.replaceCandidates(electionId, next)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Candidate change was rejected by the admin service."); }
    finally { setBusy(false); }
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!candName.trim() || !statement.trim()) return;
    await replace([...candidates, { id: `cand_${crypto.randomUUID()}`, name: candName.trim(), contest: election?.contest || "Official contest", statement: statement.trim() }]);
    setCandName(""); setStatement("");
  };

  if (!election) return <main className="mx-auto max-w-5xl px-4 py-12 text-sm" role="status">{error || "Loading the authoritative election…"}</main>;
  const locked = election.state !== "DRAFT";
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-[#1E3352]"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#157E92]">Candidate roster management</p><h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white">{election.title}</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Every change is submitted to the authoritative admin service before the list updates.</p></div><StateBadge state={election.state} size="md" /></header>
      {error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">{error}</div>}
      {locked && <div className="flex items-center gap-2 rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-xs font-semibold text-[#6B4707]"><ShieldAlert className="size-5" aria-hidden="true" />The server reports this manifest as locked. Candidate changes are disabled.</div>}
      <div className="grid gap-8 lg:grid-cols-12">
        {!locked && <form onSubmit={handleAdd} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5 dark:border-[#1E3352] dark:bg-[#132135]"><h2 className="font-bold text-[#10233F] dark:text-white">Add contestant</h2><input required value={candName} onChange={(event) => setCandName(event.target.value)} placeholder="Candidate full name" className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm" /><textarea required rows={4} value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="Platform statement" className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm" /><button disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#157E92] px-4 text-sm font-bold text-white disabled:opacity-50"><Plus className="size-4" aria-hidden="true" />{busy ? "Submitting…" : "Save candidate list"}</button></form>}
        <section className={`${locked ? "lg:col-span-12" : "lg:col-span-7"} space-y-4`}><div className="flex items-center justify-between"><h2 className="font-bold text-[#10233F] dark:text-white">Registered candidates ({candidates.length})</h2><Link href={`/officer/elections/${election.id}/roster`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#157E92] px-4 text-xs font-bold text-white">Review roster <ArrowRight className="size-4" aria-hidden="true" /></Link></div>{candidates.map((candidate) => <article key={candidate.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><div><h3 className="font-bold text-[#10233F] dark:text-white">{candidate.name}</h3><p className="mt-1 text-xs text-slate-500">{candidate.contest}</p><p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{candidate.statement}</p></div>{!locked && <button type="button" disabled={busy} onClick={() => void replace(candidates.filter((item) => item.id !== candidate.id))} className="p-2 text-slate-400 hover:text-[#C23C45]" aria-label={`Remove ${candidate.name}`}><Trash2 className="size-4" aria-hidden="true" /></button>}</article>)}</section>
      </div>
    </main>
  );
}
