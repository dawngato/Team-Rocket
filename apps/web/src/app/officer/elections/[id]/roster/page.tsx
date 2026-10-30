"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Users } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { apiClient } from "@/lib/api_client";
import type { Election, StudentRecord } from "@/lib/types";

export default function OfficerRosterReviewPage() {
  const electionId = useParams()?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!electionId) return; void Promise.all([apiClient.getElection(electionId), apiClient.getStudents()]).then(([nextElection, nextStudents]) => { if (!nextElection) throw new Error("Election not found."); setElection(nextElection); setStudents(nextStudents); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Roster service unavailable.")); }, [electionId]);
  if (!election) return <main className="mx-auto max-w-5xl px-4 py-12 text-sm" role="status">{error || "Loading authoritative roster…"}</main>;
  const verified = students.filter((student) => student.verified);
  return <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-[#1E3352]"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#157E92]"><Users className="size-4" aria-hidden="true" />Pre-freeze verification</p><h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white">Election roster review</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{election.title}</p></div><StateBadge state={election.state} size="md" /></header>{error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">{error}</div>}<div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-slate-200 p-5"><span className="text-xs text-slate-500">Identity records</span><strong className="mt-1 block text-2xl font-mono">{students.length}</strong></div><div className="rounded-xl border border-slate-200 p-5"><span className="text-xs text-slate-500">Verified records</span><strong className="mt-1 block text-2xl font-mono text-[#15805D]">{verified.length}</strong></div><div className="rounded-xl border border-slate-200 p-5"><span className="text-xs text-slate-500">Election eligible count</span><strong className="mt-1 block text-2xl font-mono">{election.eligible_count ?? "Not frozen"}</strong></div></div><section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><h2 className="font-bold text-[#10233F] dark:text-white">Authoritative verification queue</h2><p className="mt-1 text-xs text-slate-500">This queue is read from the identity service. It is not a frozen election snapshot until the server reports one.</p><div className="mt-4 space-y-2">{students.slice(0, 50).map((student) => <div key={student.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 text-xs dark:border-[#1E3352]"><span><strong className="block">{student.full_name}</strong><span className="font-mono text-slate-500">{student.student_id}</span></span><span className={student.verified ? "font-bold text-[#15805D]" : "font-semibold text-[#AA6C0B]"}>{student.status}</span></div>)}</div></section><Link href={`/officer/elections/${election.id}/schedule`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#157E92] px-4 text-sm font-bold text-white">Review schedule <ArrowRight className="size-4" aria-hidden="true" /></Link></main>;
}
