"use client";

import React, { useEffect, useState } from "react";
import { UserCheck, CheckCircle2, XCircle, AlertCircle, Search, Filter } from "lucide-react";
import { StudentRecord } from "../../../lib/types";
import { apiClient } from "../../../lib/api_client";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function TeacherVerificationQueuePage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiClient.getStudents().then((records) => {
      if (active) setStudents(records);
    }).catch((cause) => {
      if (active) setLoadError(cause instanceof Error ? cause.message : "The identity service could not load the verification queue.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleDecision = async (studentId: string, decision: "VERIFIED" | "REJECTED") => {
    try {
      const updated = await apiClient.verifyStudent(studentId, decision);
      setStudents((prev) => prev.map((s) => s.student_id === updated.student_id ? updated : s));
      setActionSuccess(`Student ${studentId} marked as ${decision}.`);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : "The identity service rejected the verification decision.");
    }
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDepartment === "ALL" || s.department === filterDepartment;
    return matchesSearch && matchesDept;
  });

  const breadcrumbs = [
    { label: "Workspace", href: "/teacher" },
    { label: "Verification Queue" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Faculty Review Desk
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Student Verification Queue
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Validate enrollment identity documents before blind credential cutoffs freeze the voter roster.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-[#15805D]/10 border border-[#15805D]/30 text-[#15805D] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {loadError && <div className="p-4 rounded-xl bg-[#C23C45]/10 border border-[#C23C45]/30 text-[#8B2630] dark:text-[#FCA5A5] text-sm" role="alert">{loadError}</div>}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white dark:bg-[#132135] p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, roll number, or email..."
            aria-label="Search verification queue"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Department:</span>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            aria-label="Filter by department"
            className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Departments</option>
            <option value="Computer Science and Engineering">Computer Science</option>
            <option value="Electronics and Communication">Electronics</option>
            <option value="Mechanical Engineering">Mechanical</option>
            <option value="Civil Engineering">Civil</option>
          </select>
        </div>
      </div>

      {/* Verification Queue Table */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-[#1E3352] text-slate-500 uppercase tracking-wider font-semibold">
                <th scope="col" className="px-6 py-4">Student</th>
                <th scope="col" className="px-6 py-4">Department</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4">Remarks / Flags</th>
                <th scope="col" className="px-6 py-4 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {loading ? <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading the authoritative identity roster…</td></tr> : filtered.map((stu) => {
                const isPending = stu.status === "PENDING_VERIFICATION";
                const isVerified = stu.status === "VERIFIED";

                return (
                  <tr key={stu.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-[#10233F] dark:text-white">
                        {stu.full_name}
                      </div>
                      <div className="text-slate-500 font-mono text-[11px]">{stu.student_id}</div>
                      <div className="text-slate-400 text-[11px]">{stu.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {stu.department}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          isVerified
                            ? "bg-[#15805D]/10 text-[#15805D] border border-[#15805D]/30"
                            : isPending
                            ? "bg-[#AA6C0B]/10 text-[#AA6C0B] border border-[#AA6C0B]/30"
                            : "bg-[#C23C45]/10 text-[#C23C45] border border-[#C23C45]/30"
                        }`}
                      >
                        {stu.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 max-w-xs">
                      {stu.flagged_reason ? (
                        <div className="flex items-start gap-1.5 text-[#AA6C0B]">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{stu.flagged_reason}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Regular enrollment match</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      {isPending ? (
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleDecision(stu.id, "VERIFIED")}
                            className="min-h-[44px] px-3 py-1.5 text-xs font-bold text-white bg-[#15805D] hover:bg-[#10664A] rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecision(stu.id, "REJECTED")}
                            className="min-h-[44px] px-3 py-1.5 text-xs font-bold text-[#C23C45] hover:bg-[#C23C45]/10 border border-[#C23C45]/30 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-semibold text-xs">
                          Decision finalized
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No roster records were returned by the identity service.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
