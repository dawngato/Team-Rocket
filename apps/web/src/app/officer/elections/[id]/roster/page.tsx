"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Users, ShieldCheck, CheckCircle2, UserCheck, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StateBadge } from "@/components/StateBadge";
import { apiClient } from "@/lib/api_client";
import type { Election, StudentRecord } from "@/lib/types";

export default function OfficerRosterReviewPage() {
  const electionId = useParams()?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!electionId) return;
    void Promise.all([
      apiClient.getElection(electionId, { includeInternal: true }),
      apiClient.getStudents(),
    ])
      .then(([nextElection, nextStudents]) => {
        if (!nextElection) throw new Error("Election not found in authoritative service.");
        setElection(nextElection);
        setStudents(nextStudents);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Authoritative roster service is currently unavailable.")
      );
  }, [electionId]);

  if (!election) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 text-sm" role="status">
        {error || "Loading authoritative voter roster from identity service..."}
      </main>
    );
  }

  const verified = students.filter((student) => student.verified);
  const verificationRate = students.length > 0 ? Math.round((verified.length / students.length) * 100) : 0;

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Transparency Officer Workspace", href: "/officer" },
          { label: "Contests", href: "/officer/elections" },
          { label: election.title, href: `/officer/elections/${election.id}/lifecycle` },
          { label: "Voter Roster Review" },
        ]}
      />

      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-[#1E3352]">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#157E92]">
            <Users className="size-4" aria-hidden="true" />
            Pre-Freeze Voter Qualification
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Electoral Roll &amp; Roster Review
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Authoritative verification of eligible Student Voters prior to election manifest cryptographic freeze.
          </p>
        </div>
        <StateBadge state={election.state} size="md" />
      </header>

      {/* Animated Telemetry Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Enrolled Voters</span>
            <div className="text-2xl font-bold font-mono text-[#10233F] dark:text-white mt-1">
              {students.length}
            </div>
            <span className="text-[11px] text-slate-500">Student Voter directory records</span>
          </div>
          <div className="p-3 rounded-xl bg-[#157E92]/10 text-[#157E92]">
            <Users className="size-5" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Verified Credentials</span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-2">
              <span>{verified.length}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {verificationRate}%
              </span>
            </div>
            <span className="text-[11px] text-slate-500">Faculty Teacher attested</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <UserCheck className="size-5" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Eligible Quorum Count</span>
            <div className="text-2xl font-bold font-mono text-[#10233F] dark:text-white mt-1">
              {election.eligible_count ?? "Pre-Freeze"}
            </div>
            <span className="text-[11px] text-slate-500">Fixed at manifest seal</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldCheck className="size-5" />
          </div>
        </motion.div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">
          {error}
        </div>
      )}

      {/* Roster Queue Table */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#1E3352] dark:bg-[#132135] overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-[#1E3352] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-base text-[#10233F] dark:text-white">
              Authoritative Verification Queue
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Live identity verification status read directly from campus identity provider.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold self-start sm:self-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live Sync</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-[#1E3352]">
              <tr>
                <th className="px-6 py-4">Student Voter Identifier</th>
                <th className="px-6 py-4">Full Legal Name</th>
                <th className="px-6 py-4">Institutional Email</th>
                <th className="px-6 py-4">Department Scope</th>
                <th className="px-6 py-4">Credential Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {students.slice(0, 50).map((student) => (
                <tr
                  key={student.id}
                  className="transition-all duration-150 hover:bg-[#F5F2EB]/80 dark:hover:bg-stone-900/80 hover:shadow-sm"
                >
                  <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                    {student.student_id}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                    {student.full_name}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                    {student.department}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        student.verified
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                      }`}
                    >
                      {student.status || (student.verified ? "VERIFIED" : "PENDING")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-2">
        <Link
          href={`/officer/elections/${election.id}/schedule`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#157E92] hover:bg-[#0E6273] px-6 text-sm font-bold text-white transition-colors shadow-sm"
        >
          <span>Proceed to Schedule &amp; Timetable</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
