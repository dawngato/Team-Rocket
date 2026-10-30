"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Play, Square } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { apiClient } from "@/lib/api_client";
import type { Election } from "@/lib/types";

export default function OfficerLifecyclePage() {
  const electionId = useParams()?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => void apiClient.getElection(electionId, { includeInternal: true }).then(setElection).catch((cause) => setError(cause instanceof Error ? cause.message : "Election status unavailable."));
  useEffect(load, [electionId]);
  const transition = async (action: "open" | "close") => { if (!election) return; setBusy(true); setError(null); try { setElection(action === "open" ? await apiClient.openElection(election.id) : await apiClient.closeElection(election.id)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Lifecycle transition rejected."); } finally { setBusy(false); } };
  if (!election) return <main className="mx-auto max-w-4xl px-4 py-12 text-sm" role="status">{error || "Loading authoritative election…"}</main>;
  return <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-[#1E3352]"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#157E92]">Voting window controls</p><h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white">Election lifecycle management</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{election.title}</p></div><StateBadge state={election.state} size="md" /></header>{error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">{error}</div>}<section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><p className="text-sm text-slate-600 dark:text-slate-300">The state shown here is read from the server after every transition. A rejected request never updates this page optimistically.</p><div className="flex flex-wrap gap-3">{election.state === "FROZEN" && <button type="button" disabled={busy} onClick={() => void transition("open")} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#157E92] px-4 text-sm font-bold text-white disabled:opacity-50"><Play className="size-4" aria-hidden="true" />Open election</button>}{election.state === "OPEN" && <button type="button" disabled={busy} onClick={() => void transition("close")} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#C23C45] px-4 text-sm font-bold text-white disabled:opacity-50"><Square className="size-4" aria-hidden="true" />Close election</button>}<Link href={`/officer/elections/${election.id}/publication`} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold">Publication workflow <ArrowRight className="size-4" aria-hidden="true" /></Link></div></section></main>;
}
