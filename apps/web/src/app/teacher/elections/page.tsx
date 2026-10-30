"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { apiClient } from "@/lib/api_client";
import type { Election, PublishedResults } from "@/lib/types";

export default function TeacherPublishedElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [results, setResults] = useState<Record<string, PublishedResults>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void apiClient.getElections().then(async (rows) => { setElections(rows); const published = await Promise.all(rows.filter((row) => row.state === "PUBLISHED").map(async (row) => [row.id, await apiClient.getResults(row.id)] as const)); setResults(Object.fromEntries(published.filter((item): item is [string, PublishedResults] => Boolean(item[1])))); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Published elections unavailable.")); }, []);
  return <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#15805D]"><Award className="size-4" aria-hidden="true" />Faculty observer portal</p><h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white">Published department elections</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Results appear only when the authoritative service publishes them.</p></header>{error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">{error}</div>}<section className="grid gap-6 md:grid-cols-2">{elections.filter((election) => election.state === "PUBLISHED").map((election) => { const result = results[election.id]; return <article key={election.id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><div className="flex items-center justify-between"><StateBadge state={election.state} size="sm" /><span className="font-mono text-xs text-slate-500">{result ? `${result.total_ballots} ballots` : "Tally unavailable"}</span></div><h2 className="text-lg font-bold text-[#10233F] dark:text-white">{election.title}</h2><div className="flex justify-between border-t border-slate-100 pt-3 text-xs dark:border-[#1E3352]"><Link href={`/results?election=${encodeURIComponent(election.id)}`} className="inline-flex items-center gap-1 font-bold text-[#157E92]">View public tally <ArrowRight className="size-4" aria-hidden="true" /></Link><Link href={`/audit?election=${encodeURIComponent(election.id)}`} className="font-semibold text-slate-500">Inspect evidence</Link></div></article>; })}{elections.filter((election) => election.state === "PUBLISHED").length === 0 && <div className="rounded-xl border border-slate-200 p-8 text-sm text-slate-500 md:col-span-2">No published election was returned.</div>}</section></main>;
}
