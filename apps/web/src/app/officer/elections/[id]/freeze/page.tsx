"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { apiClient } from "@/lib/api_client";
import type { Election } from "@/lib/types";

export default function OfficerFreezeManifestPage() {
  const electionId = useParams()?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void apiClient.getElection(electionId).then(setElection).catch((cause) => setError(cause instanceof Error ? cause.message : "Election unavailable.")); }, [electionId]);
  const freeze = async () => { if (!election) return; setBusy(true); setError(null); try { setElection(await apiClient.freezeElection(election.id)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Manifest freeze was rejected."); } finally { setBusy(false); } };
  if (!election) return <main className="mx-auto max-w-4xl px-4 py-12 text-sm" role="status">{error || "Loading authoritative election…"}</main>;
  const frozen = election.state !== "DRAFT";
  return <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-[#1E3352]"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#AA6C0B]">Immutability milestone</p><h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white">Freeze election manifest</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{election.title}</p></div><StateBadge state={election.state} size="md" /></header>{error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">{error}</div>}<section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><p className="text-sm text-slate-600 dark:text-slate-300">The digest below is authoritative only when returned by the election API. Freezing is draft-only and the server validates candidates, roster approval and timing.</p><div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs dark:border-[#1E3352] dark:bg-slate-900/40"><span className="mb-2 block font-sans text-slate-500">Manifest digest</span><span className="break-all">{election.manifest_digest || "Not frozen"}</span></div><div className="flex flex-wrap justify-between gap-3">{frozen ? <p className="text-sm font-semibold text-[#15805D]">Server reports the manifest as {election.state}.</p> : <button type="button" disabled={busy} onClick={() => void freeze()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#AA6C0B] px-4 text-sm font-bold text-white disabled:opacity-50"><Lock className="size-4" aria-hidden="true" />{busy ? "Freezing…" : "Freeze and lock manifest"}</button>}<Link href={`/officer/elections/${election.id}/lifecycle`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#157E92] px-4 text-sm font-bold text-white">Lifecycle <ArrowRight className="size-4" aria-hidden="true" /></Link></div></section></main>;
}
