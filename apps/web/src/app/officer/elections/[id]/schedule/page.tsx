"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Calendar } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { apiClient } from "@/lib/api_client";
import type { Election } from "@/lib/types";

export default function OfficerSchedulePage() {
  const electionId = useParams()?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void apiClient.getElection(electionId, { includeInternal: true }).then(setElection).catch((cause) => setError(cause instanceof Error ? cause.message : "Election schedule unavailable.")); }, [electionId]);
  if (!election) return <main className="mx-auto max-w-4xl px-4 py-12 text-sm" role="status">{error || "Loading authoritative schedule…"}</main>;
  const dates = [["Issuance cutoff", election.issuance_cutoff_utc], ["Voting opens", election.opens_at_utc], ["Voting closes", election.closes_at_utc]];
  return <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-[#1E3352]"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#157E92]"><Calendar className="size-4" aria-hidden="true" />Timeline authority</p><h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white">Election schedule and cutoffs</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{election.title}</p></div><StateBadge state={election.state} size="md" /></header><section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><p className="text-sm text-slate-600 dark:text-slate-300">These timestamps are read from the server-authoritative election record. Credential issuance must close before casting opens.</p><div className="mt-6 grid gap-4 sm:grid-cols-3">{dates.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 p-4 dark:border-[#1E3352]"><span className="text-xs text-slate-500">{label}</span><strong className="mt-2 block text-sm text-[#10233F] dark:text-white">{value ? new Date(value).toLocaleString() : "Not configured"}</strong></div>)}</div></section><Link href={`/officer/elections/${election.id}/freeze`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#157E92] px-4 text-sm font-bold text-white">Freeze manifest <ArrowRight className="size-4" aria-hidden="true" /></Link></main>;
}
