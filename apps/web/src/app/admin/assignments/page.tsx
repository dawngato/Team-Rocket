"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Award, UserCheck, CheckCircle2, Shield, AlertTriangle, Users, Vote } from "lucide-react";
import { motion } from "motion/react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ElectionAssignment, TeacherRecord, Election } from "@/lib/types";
import { apiClient, electionClient } from "@/lib/api_client";

export default function AdminAssignmentsPage() {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [elections, setElections] = useState<Election[]>([]);

  useEffect(() => {
    Promise.all([
      apiClient.getTeachers().catch(() => []),
      electionClient.getElections({ includeInternal: true }).catch(() => []),
    ]).then(([liveTeachers, liveElections]) => {
      if (liveTeachers && liveTeachers.length > 0) setTeachers(liveTeachers);
      if (liveElections && liveElections.length > 0) setElections(liveElections);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Breadcrumbs
        items={[
          { label: "Admin Console", href: "/admin" },
          { label: "Election & Faculty Delegations" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white mb-1">
            <Award className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
            <span>Institutional Governance</span>
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Election Assignments &amp; Faculty Scopes
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Departmental supervisory assignments and supervisory scopes for designated Faculty Teachers.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold self-start sm:self-auto">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>Dual Delegation Invariant Active</span>
        </div>
      </div>

      {/* Animated Telemetry Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Faculty Teachers</span>
            <div className="text-2xl font-bold font-mono text-[#10233F] dark:text-white mt-1">
              {teachers.length}
            </div>
            <span className="text-[11px] text-slate-500">Active verification officers</span>
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
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Governed Contests</span>
            <div className="text-2xl font-bold font-mono text-[#10233F] dark:text-white mt-1">
              {elections.length}
            </div>
            <span className="text-[11px] text-slate-500">Scheduled &amp; active elections</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Vote className="size-5" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Delegation Authority</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="size-6" />
              <span>Campus Admin</span>
            </div>
            <span className="text-[11px] text-slate-500">Authoritative role enforcement</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Shield className="size-5" />
          </div>
        </motion.div>
      </div>

      {/* Honest Architectural Notice */}
      <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Institutional Delegation Invariant</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          Direct election assignment provisioning is securely synchronized with authoritative department roster imports (<Link href="/admin/roster-imports" className="font-semibold underline">/admin/roster-imports</Link>) and institutional identity governance (<Link href="/super-admin/role-requests" className="font-semibold underline">/super-admin/role-requests</Link>). Dynamic inline staff delegation adjustments are strictly audited in the append-only ledger.
        </p>
      </div>

      {/* Active Faculty Summary Table */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1E3352] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="font-bold text-base text-[#10233F] dark:text-white">
            Registered Faculty Teachers &amp; Verification Officers ({teachers.length})
          </h2>
          <Link
            href="/admin/teachers"
            className="text-xs font-semibold text-[#157E92] dark:text-[#38BDF8] hover:underline"
          >
            Manage Faculty Teacher Directory &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-[#1E3352]">
              <tr>
                <th scope="col" className="px-6 py-3">Faculty ID</th>
                <th scope="col" className="px-6 py-3">Faculty Teacher Name</th>
                <th scope="col" className="px-6 py-3">Institutional Email</th>
                <th scope="col" className="px-6 py-3">Department Scope</th>
                <th scope="col" className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-xs text-slate-500">
                    No faculty teacher directory records currently loaded from the authoritative service.
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr
                    key={t.id || t.faculty_id}
                    className="transition-all duration-150 hover:bg-[#F5F2EB]/80 dark:hover:bg-stone-900/80 hover:shadow-sm"
                  >
                    <td className="px-6 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{t.faculty_id}</td>
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{t.full_name}</td>
                    <td className="px-6 py-3 text-xs text-slate-600 dark:text-slate-400">{t.email}</td>
                    <td className="px-6 py-3 text-xs font-medium text-slate-800 dark:text-slate-200">{t.department}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {t.status || "ACTIVE"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
