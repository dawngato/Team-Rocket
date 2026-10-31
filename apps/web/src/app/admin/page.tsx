"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Users, UserCheck, Vote } from "lucide-react";
import { apiClient } from "../../lib/api_client";
import type { AuditEvent, Election, StudentRecord, TeacherRecord } from "../../lib/types";

export default function AdminOverviewPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiClient.getElections(),
      apiClient.getStudents(),
      apiClient.getTeachers(),
      apiClient.getAuditEvents(),
    ]).then(([nextElections, nextStudents, nextTeachers, nextAudit]) => {
      if (!active) return;
      setElections(nextElections); setStudents(nextStudents); setTeachers(nextTeachers); setAuditEvents(nextAudit); setError(null);
    }).catch(() => { if (active) setError("Live administration data could not be loaded. No local fixture data is displayed."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openCount = elections.filter((election) => election.state === "OPEN").length;
  const verifiedStudents = students.filter((student) => student.verified).length;
  const cards = [
    { label: "Active elections", value: String(openCount), note: "Authoritative election service", icon: Vote },
    { label: "Verified students", value: `${verifiedStudents} / ${students.length}`, note: "Identity service records", icon: Users },
    { label: "Faculty officers", value: String(teachers.length), note: "Persisted role assignments", icon: UserCheck },
    { label: "Audit events", value: String(auditEvents.length), note: "Scoped append only records", icon: ShieldCheck },
  ];
  const links = [
    ["Election candidates", "/admin/candidates", "Manage nominations through the election API."],
    ["Students", "/admin/students", "Review authoritative enrollment records."],
    ["Teachers", "/admin/teachers", "Manage invited, scoped staff identities."],
    ["Audit logs", "/admin/audit-logs", "Inspect only events within your assigned scope."],
  ];

  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
    <header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]"><p className="text-xs font-bold uppercase tracking-wider text-[#157E92]">Campus administration</p><h1 className="mt-2 text-3xl font-extrabold text-[#10233F] dark:text-white">Administrator Console</h1><p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Every count below is read from an authenticated service. This page cannot edit election authority values through browser storage.</p></header>
    {error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">{error}</div>}
    {loading && <p className="text-sm text-slate-500" role="status">Loading scoped administration data…</p>}
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(({ label, value, note, icon: Icon }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><Icon className="size-5 text-[#157E92]" aria-hidden="true" /><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-3xl font-extrabold text-[#10233F] dark:text-white">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>)}</section>
    <section><h2 className="mb-4 text-xl font-bold text-[#10233F] dark:text-white">Administration workspaces</h2><div className="grid gap-4 md:grid-cols-2">{links.map(([label, href, description]) => <Link key={href} href={href} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#157E92] dark:border-[#1E3352] dark:bg-[#132135]"><span><span className="block font-bold text-[#10233F] dark:text-white">{label}</span><span className="mt-1 block text-xs text-slate-500">{description}</span></span><ArrowRight className="size-4 text-[#157E92]" aria-hidden="true" /></Link>)}</div></section>
    <p className="flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Election counts, candidate status, rosters, and deadlines are authoritative only when returned by their scoped APIs.</p>
  </main>;
}
