"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Award, UserCheck, Plus, CheckCircle2, ArrowLeft, Shield, AlertTriangle } from "lucide-react";
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8] hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Admin Overview</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white mb-1">
            <Award className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
            <span>Staff Delegations</span>
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Election Assignments
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Role assignments and departmental supervisory scopes for institutional staff.
          </p>
        </div>
      </div>

      {/* UX-27 Fix: Honest Architectural Notice instead of disabled form button */}
      <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Institutional Delegation Status</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          Direct election assignment provisioning is currently managed through authoritative department roster imports (`/admin/roster-imports`) and institutional identity governance (`/super-admin/role-requests`). Dynamic inline staff delegation creation will be enabled following Phase 4 backend policy integration.
        </p>
      </div>

      {/* Active Faculty Summary */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1E3352] flex items-center justify-between">
          <h2 className="font-bold text-base text-[#10233F] dark:text-white">
            Registered Faculty &amp; Verification Officers ({teachers.length})
          </h2>
          <Link
            href="/admin/teachers"
            className="text-xs font-semibold text-[#157E92] dark:text-[#38BDF8] hover:underline"
          >
            Manage Teacher Directory &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-[#1E3352]">
              <tr>
                <th scope="col" className="px-6 py-3">Faculty ID</th>
                <th scope="col" className="px-6 py-3">Name</th>
                <th scope="col" className="px-6 py-3">Institutional Email</th>
                <th scope="col" className="px-6 py-3">Department Scope</th>
                <th scope="col" className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-xs text-slate-500">
                    No faculty directory records currently loaded.
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr key={t.id || t.faculty_id}>
                    <td className="px-6 py-3 font-mono text-xs">{t.faculty_id}</td>
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{t.full_name}</td>
                    <td className="px-6 py-3 text-xs text-slate-600 dark:text-slate-400">{t.email}</td>
                    <td className="px-6 py-3 text-xs">{t.department}</td>
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
